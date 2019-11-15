'use strict'

const sqlite = require('sqlite-async')
const fs = require('fs-extra')

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

	async removeFile(user, hashName, ext) {
		let extension = ext
		if(ext === undefined && user !== undefined && hashName !== undefined) {
			// Get extension of file from db if it is not provided
			const sql = 'SELECT * FROM files WHERE user_upload = ? AND hash_id = ?;'
			const result = await this.db.get(sql, user, hashName)
			extension = result[2]
		}
		const serverStatus = await this.removeFileFromServer(user, hashName, extension)
		const dbStatus = await this.removeFileFromDB(user, hashName)

		if(serverStatus !== 0) {
			return 1
		} else if (dbStatus !== 0) {
			return -1
		} else {
			return 0
		}
	}

	async removeFileFromServer(user, hashName, ext) {
		// Remove file from the server
		try {
			await fs.unlink(`files/uploads/${user}/${hashName}.${ext}`, err => {
				if (err) throw err
			})
			return 0
		} catch (err) {
			console.log(err.message)
			return 1
		}
	}

	async removeFileFromDB(user, hashName, ext) {
		// Remove file from the database
		try {
			const sql = 'DELETE FROM files WHERE hash_id = ? AND extension = ? AND user_upload = ?'
			this.db.run(sql, hashName, ext, user)
			return 0
		} catch (err) {
			console.log(err.message)
			return 1
		}
	}
}
