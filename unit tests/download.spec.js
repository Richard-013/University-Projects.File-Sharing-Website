'use strict'

const Download = require('../modules/download.js')

describe('getFilePath()', () => {

	test('gets the file path to the requested resource', async done => {
		expect.assertions(1)
		const download = await new Download()
		// Upload files to test with
		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload, target_user) VALUES(?, ?, ?, ?, ?)'
		await download.db.run(sql, 'a94a8fe5', 'test.txt', 'txt', 'tester', 'testTarget')
		// Get path to the file
		const returnVal = await download.getFilePath('testTarget', 'tester', 'a94a8fe5')

		expect(returnVal).toBe('files/uploads/tester/a94a8fe5.txt')

		done() // Finish the test
	})

	test('throws correct error when there is no current username given', async done => {
		expect.assertions(1)
		const download = await new Download()
		// Run function with no current username
		await expect(download.getFilePath(undefined, 'tester', 'a94a8fe5')).rejects
			.toEqual(Error('User not logged in'))

		done()
	})

	test('throws correct error when there is no source username given', async done => {
		expect.assertions(1)
		const download = await new Download()
		// Run function with no source username
		await expect(download.getFilePath('testTarget', undefined, 'a94a8fe5')).rejects
			.toEqual(Error('No username given, file cannot be located'))

		done()
	})

	test('throws correct error when there is no hash name given', async done => {
		expect.assertions(1)
		const download = await new Download()
		// Run function with no hash name
		await expect(download.getFilePath('testTarget', 'tester', undefined)).rejects
			.toEqual(Error('No file name given, file cannot be located'))

		done()
	})

	test('throws correct error when there are no arguments given', async done => {
		expect.assertions(1)
		const download = await new Download()
		// Run function with no arguments
		await expect(download.getFilePath()).rejects
			.toEqual(Error('User not logged in'))

		done()
	})

	test('throws correct error when the user cannot access a file', async done => {
		expect.assertions(1)
		const download = await new Download()
		// Should show this message regardless of whether file exists or not
		await expect(download.getFilePath('testTarget', 'tester', '5p00p5')).rejects
			.toEqual(Error('Invalid access permissions'))

		done()
	})
})

describe('getAvailableFiles()', () => {

	test('retrieves list of files successfully', async done => {
		expect.assertions(6)
		const download = await new Download()

		// Upload files to test with
		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload, target_user) VALUES(?, ?, ?, ?, ?)'
		await download.db.run(sql, 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'test.txt', 'txt', 'tester', 'alpha')
		await download.db.run(sql, 'B28B7AF69320201D1CF206EBF28373980ADD1451', 'main.cpp', 'cpp', 'tester', 'alpha')
		await download.db.run(sql, '6D0D5876E6710EBB4F309B5AF01090CB97381D06', 'print.py', 'py', 'omega', 'alpha')

		const allFiles = await download.getAvailableFiles('alpha')
		// Test type returned
		expect(Array.isArray(allFiles)).toBeTruthy()
		// Test length of array returned
		expect(allFiles.length).toBe(3)
		// Test first item of array - Test each element hash_id, file_name, user_upload, extension (in order)
		const file1 = allFiles[0]
		expect(file1[0]).toBe('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		expect(file1[1]).toBe('test.txt')
		expect(file1[2]).toBe('tester')
		expect(file1[3]).toBe('txt')

		done()
	})

	test('returns correct code if there is a database issue', async done => {
		expect.assertions(1)
		const download = await new Download()

		const sql = 'DROP TABLE IF EXISTS files;'
		await download.db.run(sql)

		const returnVal = await download.getAvailableFiles('alpha')
		expect(returnVal).toBe(-1)
		done()
	})

	test('returns correct code if no username is given', async done => {
		expect.assertions(1)
		const download = await new Download()

		const returnVal = await download.getAvailableFiles(undefined)
		expect(returnVal).toBe(1)
		done()
	})

	test('returns correct code if username is empty', async done => {
		expect.assertions(1)
		const download = await new Download()

		const returnVal = await download.getAvailableFiles('')
		expect(returnVal).toBe(1)
		done()
	})
})

describe('verifyUserAccess()', () => {
	test('returns true if user is allowed to access the file', async done => {
		expect.assertions(1)
		const download = await new Download()

		// Inserts file into db
		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload, target_user) VALUES(?, ?, ?, ?, ?)'
		await download.db.run(sql, 'a94a8fe', 'test.txt', 'txt', 'tester', 'testTarget')

		// Checks user if the given user should have access to that file
		const access = await download.verifyUserAccess('a94a8fe', 'tester', 'testTarget')
		expect(access).toBeTruthy()
		done()
	})

	test('returns false if user is not allowed to access the file', async done => {
		expect.assertions(1)
		const download = await new Download()

		// Inserts file into db
		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload, target_user) VALUES(?, ?, ?, ?, ?)'
		await download.db.run(sql, 'a94a8fe', 'test.txt', 'txt', 'tester', 'testTarget')

		// Checks user if the given user should have access to that file
		const access = await download.verifyUserAccess('a94a8fe', 'tester', 'badPerson')
		expect(access).toBeFalsy()
		done()
	})

	test('returns false if the file does not exist', async done => {
		expect.assertions(1)
		const download = await new Download()

		// Checks user if the given user should have access to a file
		const access = await download.verifyUserAccess('a94a8fe', 'tester', 'testTarget')
		expect(access).toBeFalsy()
		done()
	})

	test('returns false if database cannot be used to verify access', async done => {
		expect.assertions(1)
		const download = await new Download()

		// Cause a database error
		const sql = 'DROP TABLE IF EXISTS files;'
		await download.db.run(sql)

		// Attempt to verify access rights
		const access = await download.verifyUserAccess('a94a8fe', 'tester', 'testTarget')
		expect(access).toBeFalsy()
		done()
	})

	test('returns false if hashName is undefined', async done => {
		expect.assertions(1)
		const download = await new Download()

		// Call function with incorrect parameter
		const access = await download.verifyUserAccess(undefined, 'tester', 'testTarget')
		expect(access).toBeFalsy()
		done()
	})

	test('returns false if sourceUser is undefined', async done => {
		expect.assertions(1)
		const download = await new Download()

		// Call function with incorrect parameter
		const access = await download.verifyUserAccess('a94a8fe', undefined, 'testTarget')
		expect(access).toBeFalsy()
		done()
	})

	test('returns false if targetUser is undefined', async done => {
		expect.assertions(1)
		const download = await new Download()

		// Call function with incorrect parameter
		const access = await download.verifyUserAccess('a94a8fe', 'tester', undefined)
		expect(access).toBeFalsy()
		done()
	})

	test('returns false if no arguments are given', async done => {
		expect.assertions(1)
		const download = await new Download()

		// Call function with no parameters
		const access = await download.verifyUserAccess()
		expect(access).toBeFalsy()
		done()
	})
})

describe('generateFileList()', () => {
	test('generates single file list correctly', async done => {
		expect.assertions(8)
		const download = await new Download()

		const originalDateCall = Date.now.bind(global.Date)
		const stubDate = jest.fn(() => 1574171633958)
		global.Date.now = stubDate

		const expectDate = await new Date(26236193 * 60000)
		const date = await expectDate.toLocaleString()

		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload, upload_time, target_user) VALUES(?, ?, ?, ?, ?, ?)'
		await download.db.run(sql, 'a94a8fe', 'test.txt', 'txt', 'tester', 26236193, 'testTarget')

		let files = await download.generateFileList('testTarget')
		expect(files.length).toBe(1)
		files = files[0]
		expect(files.fileName).toBe('test.txt')
		expect(files.uploader).toBe('tester')
		expect(files.fileType).toBe('txt')
		expect(files.timeTillDelete).toBe(71)
		expect(files.dateUploaded).toBe(date)
		expect(files.url).toBe('http://localhost:8080/file?h=a94a8fe&u=tester')

		expect(stubDate).toHaveBeenCalled()
		// Restores Date.now() to its original functionality
		global.Date.now = originalDateCall

		done()
	})

	test('generates multi-file list correctly', async done => {
		expect.assertions(8)
		const download = await new Download()

		const originalDateCall = Date.now.bind(global.Date)
		const stubDate = jest.fn(() => 1574171633958)
		global.Date.now = stubDate

		const expectDate = await new Date(26236193 * 60000)
		const date = await expectDate.toLocaleString()

		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload, upload_time, target_user) VALUES(?, ?, ?, ?, ?, ?)'
		await download.db.run(sql, 'a94a8fe', 'test.txt', 'txt', 'tester', 26236193, 'testTarget')
		await download.db.run(sql, 'b5453qe', 'main.cpp', 'cpp', 'tester', 26236193, 'testTarget')

		let files = await download.generateFileList('testTarget')
		expect(files.length).toBe(2)
		files = files[1]
		expect(files.fileName).toBe('main.cpp')
		expect(files.uploader).toBe('tester')
		expect(files.fileType).toBe('cpp')
		expect(files.timeTillDelete).toBe(71)
		expect(files.dateUploaded).toBe(date)
		expect(files.url).toBe('http://localhost:8080/file?h=b5453qe&u=tester')

		expect(stubDate).toHaveBeenCalled()
		// Restores Date.now() to its original functionality
		global.Date.now = originalDateCall

		done()
	})

	test('handles no current user correctly', async done => {
		expect.assertions(1)
		const download = await new Download()

		await expect(download.generateFileList()).rejects
			.toEqual(Error('User not logged in'))

		done()
	})

	test('handles database error correctly', async done => {
		expect.assertions(1)
		const download = await new Download()

		const sql = 'DROP TABLE IF EXISTS files;'
		await download.db.run(sql)

		await expect(download.generateFileList('test')).rejects
			.toEqual(Error('Database error'))

		done()
	})
})

describe('determineFileCat()', () => {
	test('returns correct file category for audio', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('mp3')

		expect(returnVal).toBe('audio')
		done()
	})

	test('returns correct file category for image', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('png')

		expect(returnVal).toBe('image')
		done()
	})

	test('returns correct file category for video', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('mpeg')

		expect(returnVal).toBe('video')
		done()
	})

	test('returns correct file category for compressed folder', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('rar')

		expect(returnVal).toBe('zip')
		done()
	})

	test('returns correct file category for write', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('docx')

		expect(returnVal).toBe('write')
		done()
	})

	test('returns correct file category for presentation', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('ppt')

		expect(returnVal).toBe('present')
		done()
	})

	test('returns correct file category for spreadsheet', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('xlsx')

		expect(returnVal).toBe('sheet')
		done()
	})

	test('returns correct file category for fonts', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('fon')

		expect(returnVal).toBe('fonts')
		done()
	})

	test('returns correct file category for code', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('asl')

		expect(returnVal).toBe('code')
		done()
	})

	test('returns correct file category for executable', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('exe')

		expect(returnVal).toBe('exec')
		done()
	})

	test('returns correct file category for database', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('db')

		expect(returnVal).toBe('db')
		done()
	})

	test('returns correct file category for web', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('htm')

		expect(returnVal).toBe('web')
		done()
	})

	test('returns correct file category for disk image', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('toast')

		expect(returnVal).toBe('iso')
		done()
	})

	test('returns correct file category for system file', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('tmp')

		expect(returnVal).toBe('sys')
		done()
	})

	test('returns correct file category for unrecognised file', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat('toot')

		expect(returnVal).toBe('generic')
		done()
	})

	test('returns correct file category for no extension', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.determineFileCat()

		expect(returnVal).toBe('generic')
		done()
	})
})

describe('checkCommonTypes()', () => {
	test('returns correct file category for audio file', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkCommonTypes('aif')

		expect(returnVal).toBe('audio')
		done()
	})

	test('returns correct file category for image', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkCommonTypes('png')

		expect(returnVal).toBe('image')
		done()
	})

	test('returns correct file category for video', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkCommonTypes('mpeg')

		expect(returnVal).toBe('video')
		done()
	})

	test('returns correct file category for compressed folder', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkCommonTypes('rar')

		expect(returnVal).toBe('zip')
		done()
	})

	test('returns correct file category for write', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkCommonTypes('docx')

		expect(returnVal).toBe('write')
		done()
	})

	test('returns correct file category for presentation', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkCommonTypes('ppt')

		expect(returnVal).toBe('present')
		done()
	})

	test('returns correct file category for spreadsheet', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkCommonTypes('xlsx')

		expect(returnVal).toBe('sheet')
		done()
	})

	test('returns correct file category for unrecognised extension', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkCommonTypes('doom')

		expect(returnVal).toBe('generic')
		done()
	})

	test('returns correct file category for no extension', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkCommonTypes()

		expect(returnVal).toBe('generic')
		done()
	})
})

describe('checkUncommonTypes()', () => {
	test('returns correct file category for fonts', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkUncommonTypes('ttf')

		expect(returnVal).toBe('fonts')
		done()
	})

	test('returns correct file category for code', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkUncommonTypes('asl')

		expect(returnVal).toBe('code')
		done()
	})

	test('returns correct file category for executable', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkUncommonTypes('exe')

		expect(returnVal).toBe('exec')
		done()
	})

	test('returns correct file category for database', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkUncommonTypes('db')

		expect(returnVal).toBe('db')
		done()
	})

	test('returns correct file category for web', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkUncommonTypes('htm')

		expect(returnVal).toBe('web')
		done()
	})

	test('returns correct file category for disk image', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkUncommonTypes('toast')

		expect(returnVal).toBe('iso')
		done()
	})

	test('returns correct file category for system file', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkUncommonTypes('dll')

		expect(returnVal).toBe('sys')
		done()
	})

	test('returns correct file category for unrecognised file', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkUncommonTypes('flimflam')

		expect(returnVal).toBe('generic')
		done()
	})

	test('returns correct file category for no extension', async done => {
		expect.assertions(1)
		const download = await new Download()
		const returnVal = await download.checkUncommonTypes()

		expect(returnVal).toBe('generic')
		done()
	})
})
