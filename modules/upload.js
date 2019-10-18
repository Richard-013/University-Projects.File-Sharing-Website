'use strict'
const fs = require('fs-extra')

module.exports = class Upload {

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
				
				await fs.copy(path, `files/uploads/${user}/${name}`)
				return 0
			}
		}
	}

}
