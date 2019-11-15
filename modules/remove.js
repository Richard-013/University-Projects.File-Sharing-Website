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

	async removeFile(user, hashName) {
		// Remove file from database and server

	async removeFileFromServer(user, hashName, ext) {
		// Remove file from the server
	}

	async removeFileFromDB(user, hashName) {
		// Remove file from the database
	}
}