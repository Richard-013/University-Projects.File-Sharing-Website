/* eslint-disable no-magic-numbers */
'use strict'

// Module Imports
const sqlite = require('sqlite-async')
const fs = require('fs')

/**
 * Remove Module.
 * @module remove
 */
module.exports = class Remove {
	/**
	* Remove Module constructor that sets up required database and table.
	* @class remove
	*/
	constructor(dbName = ':memory:') {
		return (async() => {
			this.db = await sqlite.open(dbName)
			// Creates a table to store details about uploaded files
			const sql = 'CREATE TABLE IF NOT EXISTS files ' +
				'(hash_id TEXT PRIMARY KEY, file_name TEXT, extension TEXT,' +
				'user_upload TEXT, upload_time, target_user TEXT);'
			await this.db.run(sql)
			return this
		})()
	}

	/**
	* Removes a file from the server and the database.
	* @async
	* @param   {string} user - Username of the user who uploaded the file.
	* @param   {string} hashName - Hash ID of the file.
	* @param   {string} extension - File extension as a string (Can be left empty and extension will be found).
	* @returns {integer} returns a status code based on outcome of function.
	*/
	async removeFile(user, hashName, extension) {
		if (user === undefined || hashName === undefined) return 3
		// If the extension is not provided, get it from the db
		let ext = extension
		if(ext === undefined) ext = await this.getExtension(user, hashName)
		if (ext !== undefined) {
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
			else return dbStatus // Database issue
		} else {
			return 4
		}
	}

	/**
	* Checks if a file exists or not, is a blocking function as it decides whether to perform server-side deletions.
	* @async
	* @param   {string} user - Username of the user who uploaded the file.
	* @param   {string} hashName - Hash ID of the file.
	* @param   {string} extension - File extension as a string (Can be left empty and extension will be found).
	* @returns {boolean} returns true if the file exists on the server, false if not.
	*/
	async doesFileExist(user, hashName, extension) {
		if (user === undefined || hashName === undefined || extension === undefined) {
			return false
		}
		// Uses synchronous function as it determines whether or not to perform file operations, so it needs to block
		return fs.existsSync(`files/uploads/${user}/${hashName}.${extension}`)
	}

	/**
	* Gets the extension of a file from the database.
	* @async
	* @param   {string} user - Username of the user who uploaded the file.
	* @param   {string} hashName - Hash ID of the file.
	* @returns {string} returns the extension in string format.
	* @returns {undefined} returns undefined if extension cannot be found.
	*/
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
			return undefined
		}
	}

	/**
	* Removes a file from the server.
	* @async
	* @param   {string} user - Username of the user who uploaded the file.
	* @param   {string} hashName - Hash ID of the file.
	* @param   {string} ext - Extension of the file.
	* @returns {integer} returns 0 on success.
	*/
	async removeFileFromServer(user, hashName, ext) {
		await fs.unlinkSync(`files/uploads/${user}/${hashName}.${ext}`)
		return 0
	}

	/**
	* Removes a file from the database.
	* @async
	* @param   {string} user - Username of the user who uploaded the file.
	* @param   {string} hashName - Hash ID of the file.
	* @param   {string} ext - Extension of the file.
	* @returns {integer} returns 0 on success, -1 if it doesn't exist, -2 if an error occurs.
	*/
	async removeFileFromDB(user, hashName, ext) {
		try {
			// Checks if the file exists before it runs the deletion
			const sqlSelect = 'SELECT COUNT(hash_id) as records FROM files WHERE user_upload = ? AND hash_id = ?;'
			const checkExists = await this.db.get(sqlSelect, user, hashName)
			// If the file is not in the database, return appropriate status code
			if(checkExists.records === 0) return -1

			const sqlDel = 'DELETE FROM files WHERE hash_id = ? AND extension = ? AND user_upload = ?;'
			this.db.run(sqlDel, hashName, ext, user)
			return 0
		} catch (err) {
			return -2
		}
	}

	/**
	* Creates a list of all files that have existed for at least three days.
	* Each subarray returned is formatted: [hashID, fileName, sourceUser, fileExtension, timeOfUpload]
	* @async
	* @returns {array} returns an array of arrays, where each subarray contains information about the file.
	* @throws  {DatabaseIssue} An issue occured when checking for expired files.
	*/
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

	/**
	* Removes old files from the server and the database.
	* @async
	* @returns {integer} returns 0 on success, 1 if there are no expired files.
	* @throws  {DeleteIssue} There was an error whilst removing old files.
	*/
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
