'use strict'
const fs = require('fs-extra')
const crypto = require('crypto')
const sqlite = require('sqlite-async')

module.exports = class FileManagement {
	constructor(dbName = ':memory:') {
		return (async() => {
			this.db = await sqlite.open(dbName)
			// Creates a table to store details about uploaded files
			const sql = 'CREATE TABLE IF NOT EXISTS files (hash_id TEXT PRIMARY KEY, file_name TEXT, extension TEXT, user_upload TEXT, FOREIGN KEY(user_upload) REFERENCES users(user));'
			await this.db.run(sql)
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

	async getAllFiles() {
		// Gets the file name and user for all available files
		const sql = 'SELECT * FROM files;'
		const files = []
		await this.db.each(sql, [], (err, row) => {
			if (err) throw err
			const file = [row.hash_id, row.file_name, row.user_upload, row.extension]
			files.push(file)
		})
		return files
	}
}