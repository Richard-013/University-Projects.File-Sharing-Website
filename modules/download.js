'use strict'

const sqlite = require('sqlite-async')

module.exports = class Download {
	constructor(dbName = ':memory:') {
		return (async() => {
			this.db = await sqlite.open(dbName)
			// Creates a table to store details about uploaded files
			const sqlFiles = 'CREATE TABLE IF NOT EXISTS files' +
				'(hash_id TEXT PRIMARY KEY, file_name TEXT, extension TEXT, user_upload TEXT, upload_time INTEGER, target_user TEXT);'
			await this.db.run(sqlFiles)
			const sqlUsers = 'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, pass TEXT);'
			await this.db.run(sqlUsers)
			return this
		})()
	}

	async getFilePath(user, hashName) {
		if (user === undefined || user === '') throw new Error('No username given, file cannot be located')
		if (hashName === undefined || hashName === '') throw new Error('No file name given, file cannot be located')
		// Get the file path for the download
		// Runs sql to find stored file name
		const sql = 'SELECT * FROM files WHERE user_upload = ? AND hash_id = ?;'
		const record = await this.db.get(sql, user, hashName)
		if (record === undefined) throw new Error('Requested file could not be found')
		const ext = record.extension
		// Combines the hashed file name and extension with the user's username to generate the file path
		const filePath = `files/uploads/${user}/${hashName}.${ext}`
		return filePath
	}

	async verifyUserAccess(hashName, sourceUser, currentUser) {
		// Checks that the current user is allowed to download chosen file
		const sql = 'SELECT * FROM files WHERE user_upload = ? AND hash_id = ?;'
		const file = await this.db.get(sql, sourceUser, hashName)
		if (file.target_user === currentUser) return true
		else return false
	}

	async getAllFiles() {
		// Gets the file name and user for all available files
		const sql = 'SELECT * FROM files;'
		const files = []
		try {
			await this.db.each(sql, [], (_err, row) => {
				const file = [row.hash_id, row.file_name, row.user_upload, row.extension]
				files.push(file)
			})

			return files
		} catch (error) {
			return error.message
		}
	}
}
