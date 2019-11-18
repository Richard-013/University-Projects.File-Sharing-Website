'use strict'

const Download = require('../modules/download.js')

describe('getFilePath()', () => {

	test('gets the file path to the requested resource', async done => {
		expect.assertions(1)
		const download = await new Download()
		// Upload files to test with
		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload) VALUES(?, ?, ?, ?)'
		await download.db.run(sql, 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'test.txt', 'txt', 'tester')
		// Get path to the file
		const returnVal = await download.getFilePath('tester', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')

		expect(returnVal).toBe('files/uploads/tester/a94a8fe5ccb19ba61c4c0873d391e987982fbbd3.txt')

		done() // Finish the test
	})

	test('throws correct error when there is no username', async done => {
		expect.assertions(1)
		const download = await new Download()

		await expect(download.getFilePath(undefined, 'a94a8fe5')).rejects
			.toEqual(Error('No username given, file cannot be located'))

		done()
	})

	test('throws correct error when there is no hash name', async done => {
		expect.assertions(1)
		const download = await new Download()

		await expect(download.getFilePath('tester', undefined)).rejects
			.toEqual(Error('No file name given, file cannot be located'))

		done()
	})

	test('throws correct error when the file does not exist', async done => {
		expect.assertions(1)
		const download = await new Download()

		await expect(download.getFilePath('tester', '5p00p5')).rejects
			.toEqual(Error('Requested file could not be found'))

		done()
	})
})

describe('getAllFiles()', () => {

	test('retrieves list of files successfully', async done => {
		expect.assertions(6)
		const download = await new Download()

		// Upload files to test with
		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload) VALUES(?, ?, ?, ?)'
		await download.db.run(sql, 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'test.txt', 'txt', 'tester')
		await download.db.run(sql, 'B28B7AF69320201D1CF206EBF28373980ADD1451', 'main.cpp', 'cpp', 'tester')
		await download.db.run(sql, '6D0D5876E6710EBB4F309B5AF01090CB97381D06', 'print.py', 'py', 'omega')

		const allFiles = await download.getAllFiles()
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

	test('throws error successfully if there is a database issue', async done => {
		expect.assertions(1)
		const download = await new Download()

		const sql = 'DROP TABLE IF EXISTS files;'
		await download.db.run(sql)

		const returnVal = await download.getAllFiles()
		expect(returnVal).toEqual('SQLITE_ERROR: no such table: files')
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

	test('returns false if database cannot be used to verify access', async done => {
		expect.assertions(1)
		const download = await new Download()

		// Inserts file into db
		const sql = 'DROP TABLE IF EXISTS files;'
		await download.db.run(sql)

		// Checks user if the given user should have access to that file
		const access = await download.verifyUserAccess('a94a8fe', 'tester', 'testTarget')
		expect(access).toBeFalsy()
		done()
	})
})
