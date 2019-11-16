'use strict'

const sqlite = require('sqlite-async')
const fs = require('fs')

module.exports = class Remove {
	constructor(dbName = ':memory:') {
		return (async() => {
			this.db = await sqlite.open(dbName)
			// Creates a table to store details about uploaded files
			const sql = 'CREATE TABLE IF NOT EXISTS files ' +
                '(hash_id TEXT PRIMARY KEY, file_name TEXT, extension TEXT, user_upload TEXT);'
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
		const fileExists = await this.doesFileExist(user, hashName, ext)
		if (ext !== undefined && extension !== null && fileExists) {
			// Runs both removal operations in parallel but awaits completion of both before moving on
			const [serverStatus, dbStatus] = await Promise.all(
				[this.removeFileFromServer(user, hashName, ext), this.removeFileFromDB(user, hashName, ext)])

			if (serverStatus !== 0) return serverStatus // Server issue
			else if (dbStatus !== 0) return dbStatus // Database issue
			else return 0 // Success
		} else {
			return 4
		}
	}

	async doesFileExist(user, hashName, extension) {
		if (user === undefined || hashName === undefined || extension === undefined || extension === null) {
			return false
		}
		try {
			const exists = fs.existsSync(`files/uploads/${user}/${hashName}.${extension}`)
			return exists
		} catch (error) {
			return false
		}
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
		try {
			fs.unlinkSync(`files/uploads/${user}/${hashName}.${ext}`)
			return 0
		} catch (err) {
			return 1
		}
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
}
