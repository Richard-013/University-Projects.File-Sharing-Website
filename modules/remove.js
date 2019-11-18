/* eslint-disable no-magic-numbers */
'use strict'

const sqlite = require('sqlite-async')
const fs = require('fs')

module.exports = class Remove {
	constructor(dbName = ':memory:') {
		return (async() => {
			this.db = await sqlite.open(dbName)
			// Creates a table to store details about uploaded files
			const sql = 'CREATE TABLE IF NOT EXISTS files ' +
                '(hash_id TEXT PRIMARY KEY, file_name TEXT, extension TEXT, user_upload TEXT, upload_time, target_user TEXT);'
			await this.db.run(sql)
			return this
		})()
	}

	// eslint-disable-next-line complexity
	async removeFile(user, hashName, extension) {
		if (user === undefined || hashName === undefined) return 3
		// If the extension is not provided, get it from the db
		let ext = extension
		if(ext === undefined) ext = await this.getExtension(user, hashName)
		if (ext !== undefined && ext !== null) {
			const fileExists = await this.doesFileExist(user, hashName, ext)
			let serverStatus = undefined
			let dbStatus = undefined

			if(fileExists) {
				// Runs both removal operations in parallel but awaits completion of both before moving on
				[serverStatus, dbStatus] = await Promise.all(
					[this.removeFileFromServer(user, hashName, ext), this.removeFileFromDB(user, hashName, ext)])

			} else {
				dbStatus = await this.removeFileFromDB(user, hashName, ext)
			}
			if (dbStatus === 0 && serverStatus === 0) return 0
			else if (serverStatus === undefined && dbStatus === 0) return 0 // File in db but not on server
			else return dbStatus // Database issue
		} else {
			return 4
		}
	}

	async doesFileExist(user, hashName, extension) {
		if (user === undefined || hashName === undefined || extension === undefined || extension === null) {
			return false
		}
		const exists = fs.existsSync(`files/uploads/${user}/${hashName}.${extension}`)
		return exists
	}

	async getExtension(user, hashName) {
		try {
			// Get extension of file from db if it is not provided
			const sql = 'SELECT * FROM files WHERE user_upload = ? AND hash_id = ?;'
			const result = await this.db.get(sql, user, hashName)
			if (result === undefined) {
				return undefined
			} else {
				return result.extension
			}
		} catch (err) {
			return null
		}
	}

	async removeFileFromServer(user, hashName, ext) {
		// Remove file from the server
		fs.unlinkSync(`files/uploads/${user}/${hashName}.${ext}`)
		return 0
	}

	async removeFileFromDB(user, hashName, ext) {
		// Remove file from the database
		try {
			// Checks if the file exists before it runs the deletion
			const sqlSelect = 'SELECT COUNT(hash_id) as records FROM files WHERE user_upload = ? AND hash_id = ?;'
			const checkExists = await this.db.get(sqlSelect, user, hashName)
			// If the file is not in the database, return appropriate status code
			if(checkExists.records === 0) {
				return -1
			}

			const sqlDel = 'DELETE FROM files WHERE hash_id = ? AND extension = ? AND user_upload = ?;'
			this.db.run(sqlDel, hashName, ext, user)

			return 0
		} catch (err) {
			return -2
		}
	}

	async getExpiredFiles() {
		const time = Math.floor(Date.now() / 60000) - 4320 // Gets the date of three days ago
		const sql = `SELECT * FROM files WHERE upload_time <= ${time};`
		const files = []
		try {
			await this.db.each(sql, [], (_err, row) => {
				const file = [row.hash_id, row.file_name, row.user_upload, row.extension, row.upload_time]
				files.push(file)
			})
			return files
		} catch (error) {
			throw new Error('An issue occured when checking for expired files')
		}
	}

	async removeExpiredFiles() {
		try {
			const expiredFiles = await this.getExpiredFiles()
			if (expiredFiles === undefined || expiredFiles.length === 0) return 1
			else {
				for (const file of expiredFiles) {
					await this.removeFile(file[2], file[0], file[3])
				}
				return 0
			}
		} catch (err) {
			const errorMessage = 'There was an error whilst removing old files'
			return errorMessage
		}
	}
}
