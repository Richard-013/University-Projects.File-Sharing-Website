/* eslint-disable no-magic-numbers */
'use strict'
const fs = require('fs-extra')
const crypto = require('crypto')
const sqlite = require('sqlite-async')

module.exports = class Upload {

	constructor(dbName = ':memory:') {
		return (async() => {
			this.db = await sqlite.open(dbName)
			const sqlFiles = 'CREATE TABLE IF NOT EXISTS files' +
				'(hash_id TEXT PRIMARY KEY, file_name TEXT, extension TEXT,' +
				'user_upload TEXT, upload_time INTEGER, target_user TEXT);'
			await this.db.run(sqlFiles) // Creates a table to store details about uploaded files if it doesn't exist

			const sqlUsers = 'CREATE TABLE IF NOT EXISTS users' +
				'(id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, pass TEXT);'
			await this.db.run(sqlUsers) // Creates a table to store user details if it doesn't exist
			return this
		})()
	}

	async uploadFile(path, originalName, sourceUser, targetUser) {
		// Tests arguments are valid before proceeding
		if (path === undefined || originalName === undefined) return [1, 'No file or path specified for upload']
		if (await this.checkValidUser(sourceUser) === false) return [1, 'Invalid user attempted upload']
		if (await this.checkValidUser(targetUser) === false) return [1, 'Selected user does not exist']
		const validPath = await fs.stat(path).catch(() => [1, 'Selected file does not exist'])
		if (validPath[0] === 1) return validPath

		// Checks if a directory already exists for the user
		await Promise.all([fs.stat('files'), fs.stat('files/uploads'), fs.stat(`files/uploads/${sourceUser}`)])
			.catch(() => {
				fs.mkdir(`files/uploads/${sourceUser}`, { recursive: true }) // Make relevant directories if they don't exist
			})

		const fileDetails = await this.generateFileDetails(originalName) // Generates the required file information
		if (fileDetails === 1) return [1, 'An error occurred whilst prepping your file for upload']

		await fs.copy(path, `files/uploads/${sourceUser}/${fileDetails[0]}`) // Copies the file to the server
		const dbInsert = await this.addToDB(fileDetails[1], originalName, fileDetails[2], sourceUser, targetUser) // Adds file details to the database
		const serverMessage = await this.checkUploadRes(dbInsert, fileDetails[1])
		return serverMessage // Returns message for server to use
	}

	async checkValidUser(username) {
		try {
			if(username === undefined) return false // Only runs function when a username is given
			const sql = 'SELECT COUNT(user) as records FROM users WHERE user = ?;'
			const data = await this.db.get(sql, username) // Checks for the username existing in the users table
			if (data.records > 0) return true // Returns true if a matching username is found in the table
			return false
		} catch (err) {
			return false
		}
	}

	async generateFileDetails(name) {
		try {
			const hashID = await this.hashFileName(name) // Hashes the file name without the extension
			const ext = await this.getExtension(name) // Gets the extension
			const saveName = `${hashID}.${ext}` // Recombines the extension and hashed file name
			const fileDetails = [saveName, hashID, ext]
			return fileDetails
		} catch (err) {
			return 1
		}
	}

	async checkUploadRes(statusCode, hashID) {
		let message = ''
		switch (statusCode) {
			case 0: // Success case
				if (hashID === undefined || hashID === '') {
					message = 'No hashID given'
				} else {
					message = hashID
				}
				return [0, message]
			case -2: // Error case 1
				message = 'User has already uploaded a file with the same name'
				return [1, message]
			case -3: // Error case 2
				message = 'Database error has occurred, please try again'
				return [1, message]
			default: // Any other case defaults here
				message = 'Something went wrong'
				return [1, message]
		}
	}

	async hashFileName(name) {
		if (!name) {
			throw new Error('No file name passed (fileName)') // Throws an error if there is no file name
		}
		const nameSplit = name.split('.')
		if (nameSplit.length <= 1) {
			throw new Error('File name is invalid: No extension found (fileName)') // Throws an error if there is no extension
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

	// eslint-disable-next-line complexity
	async addToDB(hashID, fileName, ext, sourceUser, targetUser) {
		// Insert data into the database in the files table
		try {
			if (hashID === undefined || fileName === undefined || ext === undefined || sourceUser === undefined || targetUser === undefined) {
				throw new Error('Empty data cannot be added to the database')
			}

			let sql = 'SELECT COUNT(hash_id) as records FROM files WHERE user_upload = ? AND hash_id = ?;'
			const data = await this.db.get(sql, sourceUser, hashID)
			if (data.records !== 0) throw new RangeError(`File of the same name already uploaded by ${sourceUser}`)

			const uploadTime = await this.getUploadTime()
			sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload, upload_time, target_user) VALUES(?, ?, ?, ?, ?, ?)'
			await this.db.run(sql, hashID, fileName, ext, sourceUser, uploadTime, targetUser)
			return 0
		} catch (err) {
			if (err instanceof RangeError) {
				return -2
			} else {
				return -3
			}
		}
	}

	async getUploadTime() {
		const time = Date.now() // Gets time in unix time (ms elapsed since 1st January 1970 00:00:00 UTC)
		const uploadTime = Math.floor(time / 60000) // Converts time in ms to time in minutes
		return uploadTime
	}
}
