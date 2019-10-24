'use strict'
const fs = require('fs-extra')
const crypto = require('crypto')
const sqlite = require('sqlite-async')

module.exports = class Upload {

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
					fs.mkdirSync(`files/uploads/${user}`, { recursive: true })
				}

				const fileName = await this.hashFileName(name)
				const ext = await this.getExtension(name)
				const saveName = `${fileName}.${ext}`
				await fs.copy(path, `files/uploads/${user}/${saveName}`)
				return 0
			}
		}
	}

	async hashFileName(name) {
		if (!name) {
			throw new Error('No file name passed (fileName)')
		}
		const nameSplit = name.split('.')
		if (nameSplit.length <= 1) {
			throw new Error('File name is invalid: No extension found (fileName)')
		} else {
			nameSplit.pop()
			const nameNoExt = nameSplit.join()
			const hashName = crypto.createHash('sha1')
			hashName.update(nameNoExt)
			return hashName.digest('hex')
		}
	}

	async getExtension(name) {
		if (!name) {
			throw new Error('No file name passed (getExtension)')
		}
		const nameSplit = name.split('.')
		if (nameSplit.length <= 1) {
			throw new Error('File name is invalid: No extension found (getExtension)')
		} else {
			const ext = nameSplit.pop()
			return ext
		}
	}

}
