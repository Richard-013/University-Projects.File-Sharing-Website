'use strict'
const fs = require('fs-extra')

module.exports = class Upload {

	async uploadFile(path, name, user) {
		const pathExists = fs.existsSync(`files/uploads/${user}`)
		if (pathExists !== true) {
			fs.mkdirSync(`files/uploads/${user}`, { recursive: true })
		}

		await fs.copy(path, `files/uploads/${user}/${name}`)
	}

}
