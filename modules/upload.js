/* eslint-disable no-magic-numbers */
'use strict'

// Imports
const fs = require('fs-extra')
const crypto = require('crypto')
const sqlite = require('sqlite-async')

/**
 * Upload Module.
 * @module upload
 */
module.exports = class Upload {
	/**
	* Upload Module constructor that sets up required database and tables.
	* @class upload
	*/
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

	/**
	* Uploads a file to the server and the database.
	* @async
	* @param   {string} path - Path to the file being uploaded.
	* @param   {string} originalName - Original name of the file.
	* @param   {string} sourceUser - Username of the user uploading the file.
	* @param   {string} targetUser - Username of the user the file is being shared with.
	* @returns {array} [{int} statusCode, {string} message] - Returns an array with a status code and message to reflect the outcome of the upload
	*/
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

	/**
	* Checks if a username belongs to a valid user.
	* @async
	* @param   {string} username - Username of account being checked.
	* @returns {boolean} - Returns true if user is valid, false in any other case
	*/
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

	/**
	* Creates a new file name, a hashed ID and a extension for the file being uploaded
	* @async
	* @param   {string} name - Name of the file taken straight from the upload form.
	* @returns {array} ][{string} saveName, {string} hashID, {string} ext] - saveName: name file is saved under, hashID: unique id for file, ext: file extension (type)
	*/
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

	/**
	* Takes a status code and the hash ID of the chosen file and returns an appropriate message
	* @async
	* @param   {integer} statusCode - Status of the upload operations
	* @param   {string} name - Name of the file taken straight from the upload form.
	* @returns {array} ][{integer} result, {string} message] - result: code to mark success or fail of upload, message: returns relevant message based on the statusCode
	*/
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

	/**
	* Hashes the name of the file using sha1 standards.
	* @async
	* @param   {string} name - Name of the file straight from the upload form.
	* @returns {string} hashName - Returns a hashed version of the file name (minus the extension), name is hashed using sha1 standard
	* @throws  {EmptyFileName} No file name passed (fileName).
	* @throws  {NoExtension} File name is invalid: No extension found (fileName).
	*/
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

	/**
	* Separates the extension from the filename.
	* @async
	* @param   {string} name - Name of the file straight from the upload form.
	* @returns {string} ext - Returns the extension of the file as a string
	* @throws  {EmptyFileName} No file name passed (getExtension).
	* @throws  {NoExtension} File name is invalid: No extension found (getExtension).
	*/
	async getExtension(name) {
		if (!name) {
			throw new Error('No file name passed (getExtension)') // If no name is given throw an error
		}
		const nameSplit = name.split('.')
		if (nameSplit.length <= 1) {
			throw new Error('File name is invalid: No extension found (getExtension)') // If a file doesn't have an extension throw an error
		} else {
			const ext = nameSplit.pop() // Gets the extension from the end of the file name
			return ext
		}
	}

	/**
	* Adds the details of the file and its upload to the database
	* @async
	* @param   {string} hashID - Hashed name of the file.
	* @param   {string} fileName - Name of the file straight from the upload form.
	* @param   {string} ext - Separated extension of the file as a string.
	* @param   {string} sourceUser - Username of the user who uploaded the file.
	* @param   {string} targetUser - Username of the user who the file is being shared with.
	* @returns {integer} - Returns a status code based on the outcome: 0 for success, -2 file is already uploaded, -3 any other error
	*/
	async addToDB(hashID, fileName, ext, sourceUser, targetUser) {
		try {
			const argChecks = [hashID, fileName, ext, sourceUser, targetUser]
			for (const elem of argChecks) {
				if (elem === undefined) throw new Error('Empty data cannot be added to the database')
			}

			let sql = 'SELECT COUNT(hash_id) as records FROM files WHERE user_upload = ? AND hash_id = ?;'
			const data = await this.db.get(sql, sourceUser, hashID) // Checks if the file already exists
			if (data.records !== 0) throw new RangeError(`File of the same name already uploaded by ${sourceUser}`)

			const uploadTime = await this.getUploadTime()
			sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload, upload_time, target_user)' +
				'VALUES(?, ?, ?, ?, ?, ?)' // Adds details to the database
			await this.db.run(sql, hashID, fileName, ext, sourceUser, uploadTime, targetUser)
			return 0
		} catch (err) {
			if (err instanceof RangeError) {
				return -2 // Code for database error
			} else {
				return -3 // Code for any other error
			}
		}
	}

	/**
	* Adds the details of the file and its upload to the database
	* @async
	* @returns {integer} uploadTime - Retuns unix time in minutes (not ms as is the default)
	*/
	async getUploadTime() {
		const time = Date.now() // Gets time in unix time (ms elapsed since 1st January 1970 00:00:00 UTC)
		const uploadTime = Math.floor(time / 60000) // Converts time in ms to time in minutes
		return uploadTime
	}
}
