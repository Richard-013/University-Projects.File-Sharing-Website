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

	async uploadFile(path, name, user) {
		if (path === undefined || name === undefined) {
			return 1 // No file or no path specified for upload
		} else {
			if(fs.existsSync(path) === false) {
				return -1 // Selected file does not exist
			} else {
				const pathExists = fs.existsSync(`files/uploads/${user}`)
				if (pathExists !== true) {
					fs.mkdirSync(`files/uploads/${user}`, { recursive: true }) // Make a directory if it doesn't exist
				}

				const fileName = await this.hashFileName(name) // Hashes the file name without the extension
				const ext = await this.getExtension(name) // Gets the extension
				const saveName = `${fileName}.${ext}` // Recombines the extension and hashed file name
				await fs.copy(path, `files/uploads/${user}/${saveName}`) // Copies the file to the server
				const dbInsert = await this.addToDB(fileName, name, ext, user) // Adds file details to the database
				return dbInsert // Returns status code from addToDB
			}
		}
	}

	async hashFileName(name) {
		// Throws an error if there is no file name
		if (!name) {
			throw new Error('No file name passed (fileName)')
		}
		const nameSplit = name.split('.')
		// Throws an error if there is no extension
		if (nameSplit.length <= 1) {
			throw new Error('File name is invalid: No extension found (fileName)')
		} else {
			nameSplit.pop()
			const nameNoExt = nameSplit.join()
			const hashName = crypto.createHash('sha1') // Creates a hash using sha1 standards
			hashName.update(nameNoExt) // Hashes the file name
			return hashName.digest('hex') // Returns the hashed file name in hexidecimal format
		}
	}

	async getExtension(name) {
		// If no name is given throw an error
		if (!name) {
			throw new Error('No file name passed (getExtension)')
		}
		const nameSplit = name.split('.')
		// If a file doesn't have an extension throw an error
		if (nameSplit.length <= 1) {
			throw new Error('File name is invalid: No extension found (getExtension)')
		} else {
			// Gets the extension from the end of the file name
			const ext = nameSplit.pop()
			return ext
		}
	}

	async addToDB(hashID, fileName, ext, username) {
		// Insert data into the database in the files table
		try {
			if (hashID === undefined || fileName === undefined || ext === undefined || username === undefined) {
				throw new Error('Empty data cannot be added to the database')
			}

			let sql = 'SELECT COUNT(hash_id) as records FROM files WHERE user_upload = ? AND hash_id = ?;'
			const data = await this.db.get(sql, username, hashID)
			if (data.records !== 0) throw new RangeError(`File of the same name already uploaded by ${username}`)

			sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload) VALUES(?, ?, ?, ?)'
			await this.db.run(sql, hashID, fileName, ext, username)
			return 0
		} catch (err) {
			if (err instanceof RangeError) {
				return -2
			} else {
				return -3
			}
		}
	}

	async getFilePath(user, hashName) {
		// Get the file path for the download
		// Runs sql to find stored file name
		const sql = 'SELECT * FROM files WHERE user_upload = ? AND hash_id = ?;'
		const record = await this.db.get(sql, user, hashName)
		const ext = record.extension
		// Combines the hashed file name and extension with the user's username to generate the file path
		const filePath = `files/uploads/${user}/${hashName}.${ext}`
		return filePath
	}
}
