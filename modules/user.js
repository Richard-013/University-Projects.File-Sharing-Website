'use strict'

// Module Imports
const bcrypt = require('bcrypt-promise')
const fs = require('fs-extra')
const sqlite = require('sqlite-async')
const saltRounds = 10

/**
 * User Module.
 * @module user
 */
module.exports = class User {
	/**
	* User Module constructor that sets up required database and table.
	* @class user
	*/
	constructor(dbName = ':memory:') {
		return (async() => {
			this.db = await sqlite.open(dbName)
			const sql = 'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, pass TEXT);'
			await this.db.run(sql) // Creates the table to store user details
			return this
		})()
	}

	/**
	* Registers a user on the system.
	* @async
	* @param   {string} user - Username for the new user.
	* @param   {string} pass - Password of the new user.
	* @returns {boolean} returns true on success.
	* @throws  {UsernameInUse} username [user] already in use.
	*/
	async register(user, pass) {
		try {
			if(user.length === 0) throw new Error('missing username')
			if(pass.length === 0) throw new Error('missing password')
			let sql = `SELECT COUNT(id) as records FROM users WHERE user="${user}";`
			const data = await this.db.get(sql)
			if(data.records !== 0) throw new Error(`username "${user}" already in use`)
			pass = await bcrypt.hash(pass, saltRounds)
			sql = `INSERT INTO users(user, pass) VALUES("${user}", "${pass}")`
			await this.db.run(sql)
			return true
		} catch(err) {
			throw err
		}
	}

	/**
	* Uploads an avatar.
	* @async
	* @param   {string} path - Path to the file
	* @param   {string} name - Name of the file.
	* @param   {string} username - Password of the new user.
	* @returns {integer} returns 0 if no file is uploaded.
	* @throws  {NoUsername} No Username.
	*/
	async uploadAvatar(path, name, username) {
		if (username === undefined || username.length === 0 ) throw new Error('No Username')
		if(path === undefined || name === undefined || name === '') {
			// Allows the user to not upload an avatar if they so choose
			return 0
		}
		const nameSplit = name.split('.')
		const ext = nameSplit.pop()
		const image = ['ai', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'ps', 'psd', 'svg', 'tif', 'tiff']
		if (!image.includes(ext)) throw new Error('Avatar file must be an image')
		await fs.copy(path, `public/avatars/${username}.${ext}`)
	}

	/**
	* Logs a user on to the system.
	* @async
	* @param   {string} username - Path to the file
	* @param   {string} password - Name of the file.
	* @returns {boolean} returns true on successful login, false otherwise.
	* @throws  {NoUsername} No Username.
	*/
	async login(username, password) {
		try {
			let sql = `SELECT count(id) AS count FROM users WHERE user="${username}";`
			const records = await this.db.get(sql)
			if(!records.count) throw new Error(`username "${username}" not found`)
			sql = `SELECT pass FROM users WHERE user = "${username}";`
			const record = await this.db.get(sql)
			const valid = await bcrypt.compare(password, record.pass)
			if(valid === false) throw new Error(`invalid password for account "${username}"`)
			return true
		} catch(err) {
			throw err
		}
	}

}
