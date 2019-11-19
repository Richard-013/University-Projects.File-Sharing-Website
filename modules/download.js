'use strict'

const sqlite = require('sqlite-async')

module.exports = class Download {
	constructor(dbName = ':memory:', siteURL = 'http://localhost:8080') {
		return (async() => {
			this.siteURL = siteURL
			this.db = await sqlite.open(dbName)
			// Creates a table to store details about uploaded files
			const sqlFiles = 'CREATE TABLE IF NOT EXISTS files' +
				'(hash_id TEXT PRIMARY KEY, file_name TEXT, extension TEXT, user_upload TEXT, upload_time INTEGER, target_user TEXT);'
			await this.db.run(sqlFiles)
			return this
		})()
	}

	async getFilePath(current, source, hash) {
		if (current === undefined || current === '') throw new Error('User not logged in')
		if (source === undefined || source === '') throw new Error('No username given, file cannot be located')
		if (hash === undefined || hash === '') throw new Error('No file name given, file cannot be located')
		if (await this.verifyUserAccess(hash, source, current) === false) throw new Error('Invalid access permissions')
		else {
			// Runs sql to find stored file name
			const sql = 'SELECT * FROM files WHERE user_upload = ? AND hash_id = ?;'
			const record = await this.db.get(sql, source, hash)
			const ext = record.extension
			// Combines the hashed file name and extension with the user's username to generate the file path
			const filePath = `files/uploads/${source}/${hash}.${ext}`
			return filePath
		}
	}

	async verifyUserAccess(hashName, sourceUser, currentUser) {
		if (hashName === undefined || sourceUser === undefined || currentUser === undefined) return false
		try {
			// Checks that the current user is allowed to download chosen file
			const sql = 'SELECT * FROM files WHERE user_upload = ? AND hash_id = ?;'
			const file = await this.db.get(sql, sourceUser, hashName)
			if (file === undefined) return false
			else if (file.target_user === currentUser) return true
			else return false
		} catch (err) {
			return false
		}
	}

	async getAvailableFiles(currentUser) {
		// Gets the file name and user for all available files
		if (currentUser === undefined || currentUser === '') return 1
		const files = []
		try {
			const sql = 'SELECT * FROM files WHERE target_user = ?;'
			await this.db.each(sql, [currentUser], (_err, row) => {
				const file = [row.hash_id, row.file_name, row.user_upload, row.extension, row.upload_time]
				files.push(file)
			})

			return files
		} catch (error) {
			return -1
		}
	}

	async determineFileCat(extension) {
		// Determines file type category for use with icons on file list
		if(extension === undefined) return 'generic'
		return this.checkCommonTypes(extension)
	}

	async checkCommonTypes(extension) {
		// Checks if file is an audio file
		const audio = ['aif', 'cda', 'mid', 'midi', 'mp3', 'mpa', 'ogg', 'wav', 'wma', 'wpl']
		if (audio.includes(extension)) return 'audio'
		// Checks if file is an image file
		const image = ['ai', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'ps', 'psd', 'svg', 'tif', 'tiff']
		if (image.includes(extension)) return 'image'
		// Checks if file is a video file
		const video = ['3g2', '3gp', 'avi', 'flv', 'h264', 'm4v', 'mkv', 'mov', 'mp4', 'mpg', 'mpeg', 'rm', 'swf', 'vob', 'wmv']
		if (video.includes(extension)) return 'video'
		// Checks if file is a compressed file
		const zip = ['7z', 'arj', 'deb', 'pkg', 'rar', 'rpm', 'targ.gz', 'gz', 'z', 'zip']
		if (zip.includes(extension)) return 'zip'
		// Checks if file is a written document file
		const write = ['doc', 'docx', 'pdf', 'rtf', 'tex', 'txt', 'wks', 'wps', 'wpd']
		if (write.includes(extension)) return 'write'
		// Checks if file is a presentation file
		const present = ['key', 'odp', 'pps', 'ppt', 'pptx']
		if (present.includes(extension)) return 'present'
		// Checks if file is a spreadsheet file
		const sheet = ['ods', 'xlr', 'xls', 'xlsx']
		if (sheet.includes(extension)) return 'sheet'
		// Check for more uncommon file types
		return await this.checkUncommonTypes(extension)
	}

	async checkUncommonTypes(extension) {
		// Checks if file is a font file
		const fonts = ['fnt', 'fon', 'otf', 'ttf']
		if (fonts.includes(extension)) return 'fonts'
		// Checks if file is a programming file
		const code = ['asl', 'c', 'class', 'cpp', 'cs', 'h', 'java', 'js', 'py', 'sh', 'swift', 'vb']
		if (code.includes(extension)) return 'code'
		// Checks if file is an executable file
		const exec = ['apk', 'bat', 'bin', 'cgi', 'pl', 'com', 'exe', 'gadget', 'jar', 'wsf']
		if (exec.includes(extension)) return 'exec'
		// Checks if file is a database file
		const db = ['csv', 'dat', 'db', 'dbf', 'json', 'log', 'mdb', 'sav', 'sql', 'tar', 'xml']
		if (db.includes(extension)) return 'db'
		// Checks if file is a web file
		const web = ['asp', 'aspx', 'cer', 'cfm', 'css', 'htm', 'html', 'jsp', 'part', 'php', 'rss', 'xhtml']
		if (web.includes(extension)) return 'web'
		// Checks if file is a disk image file
		const iso = ['bin', 'dmg', 'iso', 'toast', 'vcd']
		if (iso.includes(extension)) return 'iso'
		// Checks if file is a system file
		const sys = ['bak', 'cab', 'cfg', 'cpl', 'cur', 'dll', 'dmp', 'drv', 'icns', 'ico', 'ini', 'lnk', 'msi', 'sys', 'tmp']
		if (sys.includes(extension)) return 'sys'
		// If none of the above, return genric file category
		return 'generic'
	}

	async generateFileList(currentUser) {
		const availableFiles = await this.getAvailableFiles(currentUser)
		if (availableFiles === -1) throw new Error('Database error')
		if (availableFiles === 1) throw new Error('User not logged in')
		else {
			const fileList = []
			for (const file of availableFiles) {
				const uploadDate = await new Date(file[4] * 60000)
				const fileInfo = {
					fileName: file[1],
					uploader: file[2],
					fileType: file[3],
					fileCat: await this.determineFileCat(file[3]),
					// Converts stored time into hours until deletion
					timeTillDelete: await Math.floor(Math.floor(file[4] - (Date.now() - 259200000) / 60000) / 60),
					dateUploaded: await uploadDate.toLocaleString(), // Converts stored time into the upload date
					url: `${this.siteURL}/file?h=${file[0]}&u=${file[2]}` // Generates share url
				}
				fileList.push(fileInfo)
			}
			return fileList
		}
	}
}
