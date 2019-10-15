'use strict'
const fs = require('fs-extra')

module.exports = class Upload {

	async uploadFile(path, name, user) {
		if (fs.existsSync('files') !== true) {
			fs.mkdirSync(`files/uploads/${user}`, { recursive: true })
		} else if (fs.existsSync('files/uploads') !== true) {
			fs.mkdirSync(`files/uploads/${user}`, { recursive: true })
		} else if (fs.existsSync(`files/uploads/${user}`) !== true) {
			fs.mkdirSync(`files/uploads/${user}`)
		}

		fs.copy(path, `files/uploads/${user}/${name}`)
	}

}
