'use strict'

const Remove = require('../modules/remove.js')
const mock = require('mock-fs')
const fs = require('fs-extra')

describe('removeFile()', () => {
	beforeEach(() => {
		mock({
			'files': {
				'uploads': {
					'testing': {}
				}
			}
		})
	})

	afterEach(mock.restore)

	test('checks if file was removed successfully', async done => {
		expect.assertions(3)
		const remove = await new Remove()

		// Mock upload of file to system
		await fs.writeFile('files/uploads/testing/a94a8fe5ccb19ba61c4c0873d391e987982fbbd3.txt', 'test file', err => {
			if (err) throw err
		})
		const sqlInsert = 'INSERT INTO files (hash_id, file_name, extension, user_upload) VALUES(?, ?, ?, ?);'
		await remove.db.run(sqlInsert, 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'test.txt', 'txt', 'testing')

		const sqlSelect = 'SELECT COUNT(hash_id) as records FROM files WHERE user_upload = ? AND hash_id = ?;'
		const checkDB = await remove.db.get(sqlSelect, 'testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')

		// Check the mocked upload worked
		expect(fs.existsSync('files/uploads/testing/a94a8fe5ccb19ba61c4c0873d391e987982fbbd3.txt')).toBeTruthy()
		expect(checkDB.records).not.toBe(0)

		// Removes the file from the database and the server
		const returnVal = await remove.removeFile('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'txt')

		// Test if removal was a success
		expect(returnVal).toBe(0)

		done() // Finish the test
	})

	test('handles undefined username correctly', async done => {
		expect.assertions(1)
		const remove = await new Remove()
		// Run removeFile with no username
		const returnVal = await remove.removeFile(undefined, 'a94a8fe5', 'cpp')
		expect(returnVal).toBe(3)

		done()
	})

	test('handles undefined hash id correctly', async done => {
		expect.assertions(1)
		const remove = await new Remove()
		// Run removeFile with no hashID
		const returnVal = await remove.removeFile('testing', undefined, 'cpp')
		expect(returnVal).toBe(3)

		done()
	})

	test('handles undefined username and hash id correctly', async done => {
		expect.assertions(1)
		const remove = await new Remove()
		// Run removeFile with no username or hashID
		const returnVal = await remove.removeFile(undefined, undefined, 'cpp')
		expect(returnVal).toBe(3)

		done()
	})

	test('handles no parameters correctly', async done => {
		expect.assertions(1)
		const remove = await new Remove()
		// Run removeFile with no parameters
		const returnVal = await remove.removeFile()
		expect(returnVal).toBe(3)

		done()
	})

	test('handles undefined extension correctly when file exists', async done => {
		expect.assertions(3)
		const remove = await new Remove()

		// Mock upload of file to system
		await fs.writeFile('files/uploads/testing/a94a8fe5ccb19ba61c4c0873d391e987982fbbd3.txt', 'test file', err => {
			if (err) throw err
		})
		const sqlInsert = 'INSERT INTO files (hash_id, file_name, extension, user_upload) VALUES(?, ?, ?, ?);'
		await remove.db.run(sqlInsert, 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'test.txt', 'txt', 'testing')

		const sqlSelect = 'SELECT COUNT(hash_id) as records FROM files WHERE user_upload = ? AND hash_id = ?;'
		const checkDB = await remove.db.get(sqlSelect, 'testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')

		// Check the mocked upload worked
		expect(fs.existsSync('files/uploads/testing/a94a8fe5ccb19ba61c4c0873d391e987982fbbd3.txt')).toBeTruthy()
		expect(checkDB.records).not.toBe(0)

		// Removes the file from the database and the server, without giving the extension
		const returnVal = await remove.removeFile('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')

		// Test if removal was a success
		expect(returnVal).toBe(0)

		done()
	})

	test('handles undefined extension correctly when file does not exist', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		// Run removeFile with no extension and file doesn't actually exist
		const returnVal = await remove.removeFile('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		expect(returnVal).toBe(4)

		done()
	})

	test('handles extension correctly when a db error occurs before extension is retrieved', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		// Remove the table to cause db error
		const sql = 'DROP TABLE IF EXISTS files;'
		await remove.db.run(sql)

		// Run removeFile with no extension and file doesn't actually exist
		const returnVal = await remove.removeFile('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		expect(returnVal).toBe(4)

		done()
	})

	test('handles non-existant file correctly', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		// Run removeFile with no extension and file doesn't actually exist
		const returnVal = await remove.removeFile('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'txt')
		expect(returnVal).toBe(-1)
		done()
	})

	test('file is gone but still has record on the database', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		// Mock upload of file to database
		const sqlInsert = 'INSERT INTO files (hash_id, file_name, extension, user_upload) VALUES(?, ?, ?, ?);'
		await remove.db.run(sqlInsert, 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'test.txt', 'txt', 'testing')

		// Run removeFile with no extension and file doesn't actually exist
		const returnVal = await remove.removeFile('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'txt')
		expect(returnVal).toBe(0)
		done()
	})
})

describe('doesFileExist()', () => {
	beforeEach(() => {
		mock({
			'files': {
				'uploads': {
					'testing': {},
					'testing1': {
						'a94a8fe5.txt': 'test file'
					},
					'testing2': {}
				}
			}
		})
	})

	afterEach(mock.restore)

	test('file exists so return true', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		expect(remove.doesFileExist('testing1', 'a94a8fe5', 'txt')).toBeTruthy()

		await fs.remove('files/uploads/testing1', err => {
			if (err) throw err
		})
		done()
	})

	test('file does not exist so return false', async done => {
		expect.assertions(1)
		const remove = await new Remove()
		expect(await remove.doesFileExist('testing2', 'a94a8fe', 'txt')).toBeFalsy()
		done()
	})

	test('returns false if no username given', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		// Runs doesFileExist with no username
		expect(await remove.doesFileExist(undefined, 'a94a8fe', 'txt')).toBeFalsy()
		done()
	})

	test('returns false is no hash ID is given', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		// Runs doesFileExist with no hash id
		expect(await remove.doesFileExist('test', undefined, 'txt')).toBeFalsy()
		done()
	})

	test('returns false if no extension is given', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		// Runs doesFileExist with no extension
		expect(await remove.doesFileExist('test', 'a94a8fe', undefined)).toBeFalsy()
		done()
	})

	test('returns false if extension is null', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		// Runs doesFileExist with null extension
		expect(await remove.doesFileExist('test', 'a94a8fe', null)).toBeFalsy()
		done()
	})

	test('returns false if no arguments given', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		// Runs doesFileExist with no arguments passed in
		expect(await remove.doesFileExist()).toBeFalsy()
		done()
	})
})

describe('getExtension()', () => {

	test('gets the extension of a given file', async done => {
		expect.assertions(2)
		const remove = await new Remove()

		// Mock upload file to database
		const sqlInsert = 'INSERT INTO files (hash_id, file_name, extension, user_upload) VALUES(?, ?, ?, ?);'
		await remove.db.run(sqlInsert, 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'test.txt', 'txt', 'testing')

		// Check the mocked upload worked
		const sqlSelect = 'SELECT COUNT(hash_id) as records FROM files WHERE user_upload = ? AND hash_id = ?;'
		const checkDB = await remove.db.get(sqlSelect, 'testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		expect(checkDB.records).not.toBe(0)

		const extension = await remove.getExtension('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		expect(extension).toBe('txt')
		done()
	})

	test('returns undefined if no matching file or extension exists', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		const extension = await remove.getExtension('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		expect(extension).toBe(undefined)
		done()
	})

	test('returns undefined if an error occurs', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		// Remove the table to cause db error
		const sql = 'DROP TABLE IF EXISTS files;'
		await remove.db.run(sql)

		const extension = await remove.getExtension('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		expect(extension).toBe(undefined)
		done()
	})
})

describe('removeFileFromServer()', () => {
	beforeEach(() => {
		mock({
			'files': {
				'uploads': {
					'testing': {}
				}
			}
		})
	})

	afterEach(mock.restore)

	test('checks if file was removed from the server', async done => {
		expect.assertions(3)
		const remove = await new Remove()
		await fs.writeFile('files/uploads/testing/a94a8fe5ccb19ba61c4c0873d391e987982fbbd3.txt', 'test file', err => {
			if (err) throw err
		})

		// Check the mocked upload worked
		expect(fs.existsSync('files/uploads/testing/a94a8fe5ccb19ba61c4c0873d391e987982fbbd3.txt')).toBeTruthy()

		// Remove the file from the server
		const returnVal = await remove.removeFileFromServer(
			'testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'txt')

		// Test if removal was a success
		expect(fs.existsSync('files/uploads/testing/a94a8fe5ccb19ba61c4c0873d391e987982fbbd3.txt')).toBeFalsy()
		expect(returnVal).toBe(0)

		done() // Finish the test
	})
})

describe('removeFileFromDB()', () => {

	test('checks if file was removed from the database', async done => {
		expect.assertions(3)
		const remove = await new Remove()

		// Mock upload of file to database
		const sqlInsert = 'INSERT INTO files (hash_id, file_name, extension, user_upload) VALUES(?, ?, ?, ?);'
		await remove.db.run(sqlInsert, 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'test.txt', 'txt', 'testing')

		const sqlSelect = 'SELECT COUNT(hash_id) as records FROM files WHERE user_upload = ? AND hash_id = ?;'
		let checkDB = await remove.db.get(sqlSelect, 'testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')

		// Check mocked upload worked
		expect(checkDB.records).not.toBe(0)

		const returnVal = await remove.removeFileFromDB('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'txt')
		checkDB = await remove.db.get(sqlSelect, 'testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')

		// Test if removal was a success
		expect(checkDB.records).toBe(0)
		expect(returnVal).toBe(0)

		done() // Finish the test
	})

	test('returns correct error code for file not existing', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		// Run removal on item not in database
		const returnVal = await remove.removeFileFromDB('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'txt')

		expect(returnVal).toBe(-1)

		done()
	})

	test('returns correct error code for database error', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		// Remove the table to cause db error
		const sql = 'DROP TABLE IF EXISTS files;'
		await remove.db.run(sql)

		// Run removal on item not in database
		const returnVal = await remove.removeFileFromDB('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'txt')

		expect(returnVal).toBe(-2)

		done()
	})
})

describe('getExpiredFiles()', () => {
	test('gets expired files from database', async done => {
		expect.assertions(4)
		const remove = await new Remove()

		// Stubs Date.now() calls so they return 1574007598432 every time
		const originalDateCall = Date.now.bind(global.Date)
		const stubDate = jest.fn(() => 1574007598432)
		global.Date.now = stubDate

		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload, upload_time) VALUES(?, ?, ?, ?, ?);'
		await remove.db.run(sql, 'a94a8fe', 'test.txt', 'txt', 'testing', 26229139)
		await remove.db.run(sql, 'b05b9gf', 'main.cpp', 'cpp', 'testing', 26228731)

		const files = await remove.getExpiredFiles()
		const file1 = files[0]
		const file2 = files[1]

		// Checks two files were retrieved
		expect(files.length).toBe(2)

		// Checks two distinct files were retrieved
		expect(file1[0]).toBe('a94a8fe')
		expect(file2[0]).toBe('b05b9gf')

		expect(stubDate).toHaveBeenCalled() // Checks the stub was called

		// Restores Date.now() to its original functionality
		global.Date.now = originalDateCall
		done()
	})

	test('retrieves no files if none have gone beyond 3 days of upload time', async done => {
		expect.assertions(2)
		const remove = await new Remove()

		// Stubs Date.now() calls so they return 1574007598432 every time
		const originalDateCall = Date.now.bind(global.Date)
		const stubDate = jest.fn(() => 1574007598432)
		global.Date.now = stubDate

		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload, upload_time) VALUES(?, ?, ?, ?, ?);'
		await remove.db.run(sql, 'a94a8fe', 'test.txt', 'txt', 'testing', 26229300)
		await remove.db.run(sql, 'b05b9gf', 'main.cpp', 'cpp', 'testing', 26229300)

		const files = await remove.getExpiredFiles()

		// Checks no files were retrieved
		expect(files.length).toBe(0)

		expect(stubDate).toHaveBeenCalled() // Checks the stub was called

		// Restores Date.now() to its original functionality
		global.Date.now = originalDateCall
		done()
	})

	test('retrieves no files if none are present', async done => {
		expect.assertions(2)
		const remove = await new Remove()

		// Stubs Date.now() calls so they return 1574007598432 every time
		const originalDateCall = Date.now.bind(global.Date)
		const stubDate = jest.fn(() => 1574007598432)
		global.Date.now = stubDate

		const files = await remove.getExpiredFiles()

		// Checks no files were retrieved
		expect(files.length).toBe(0)

		expect(stubDate).toHaveBeenCalled() // Checks the stub was called

		// Restores Date.now() to its original functionality
		global.Date.now = originalDateCall
		done()
	})

	test('throws correct error when something goes wrong', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		const sql = 'DROP TABLE IF EXISTS files;'
		await remove.db.run(sql)

		await expect(remove.getExpiredFiles())
			.rejects.toEqual(Error('An issue occured when checking for expired files'))

		done()
	})
})

describe('removeExpiredFiles()', () => {
	beforeEach(() => {
		mock({
			'files': {
				'uploads': {
					'testing': {}
				}
			}
		})
	})

	afterEach(mock.restore)

	test('removes expired file successfully', async done => {
		expect.assertions(4)
		const remove = await new Remove()

		// Stubs Date.now() calls so they return 1574007598432 every time
		const originalDateCall = Date.now.bind(global.Date)
		const stubDate = jest.fn(() => 1574007598432)
		global.Date.now = stubDate

		await fs.writeFile('files/uploads/testing/a94a8fe.txt', 'test file', err => {
			if (err) throw err
		})
		await fs.writeFile('files/uploads/testing/b05b9gf.cpp', '#include <iostream>', err => {
			if (err) throw err
		})

		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload, upload_time) VALUES(?, ?, ?, ?, ?);'
		await remove.db.run(sql, 'a94a8fe', 'test.txt', 'txt', 'testing', 26229139)
		await remove.db.run(sql, 'b05b9gf', 'main.cpp', 'cpp', 'testing', 26228731)

		const returnVal = await remove.removeExpiredFiles()

		expect(returnVal).toBe(0) // Check for successful execution

		// Check files were removed
		expect(fs.existsSync('files/uploads/testing/a94a8fe.txt')).toBeFalsy()
		expect(fs.existsSync('files/uploads/testing/b05b9gf.cpp')).toBeFalsy()

		expect(stubDate).toHaveBeenCalled() // Checks the stub was called

		// Restores Date.now() to its original functionality
		global.Date.now = originalDateCall

		done()
	})

	test('does not delete files if they have not expired', async done => {
		expect.assertions(4)
		const remove = await new Remove()

		// Stubs Date.now() calls so they return 1574007598432 every time
		const originalDateCall = Date.now.bind(global.Date)
		const stubDate = jest.fn(() => 1574007598432)
		global.Date.now = stubDate

		await fs.writeFile('files/uploads/testing/a94a8fe.txt', 'test file', err => {
			if (err) throw err
		})
		await fs.writeFile('files/uploads/testing/b05b9gf.cpp', '#include <iostream>', err => {
			if (err) throw err
		})

		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload, upload_time) VALUES(?, ?, ?, ?, ?);'
		await remove.db.run(sql, 'a94a8fe', 'test.txt', 'txt', 'testing', 26229300)
		await remove.db.run(sql, 'b05b9gf', 'main.cpp', 'cpp', 'testing', 26229300)

		const returnVal = await remove.removeExpiredFiles()

		expect(returnVal).toBe(1) // Check for successful execution

		// Check files were removed
		expect(fs.existsSync('files/uploads/testing/a94a8fe.txt')).toBeTruthy()
		expect(fs.existsSync('files/uploads/testing/b05b9gf.cpp')).toBeTruthy()

		expect(stubDate).toHaveBeenCalled() // Checks the stub was called

		// Restores Date.now() to its original functionality
		global.Date.now = originalDateCall

		done()
	})

	test('handles errors correctly', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		const sql = 'DROP TABLE IF EXISTS files;'
		await remove.db.run(sql)

		const returnVal = await remove.removeExpiredFiles()

		expect(returnVal).toBe('There was an error whilst removing old files') // Check for correct message

		done()
	})

	test('handles files that only exist in the database correctly', async done => {
		expect.assertions(2)
		const remove = await new Remove()

		// Stubs Date.now() calls so they return 1574007598432 every time
		const originalDateCall = Date.now.bind(global.Date)
		const stubDate = jest.fn(() => 1574007598432)
		global.Date.now = stubDate

		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload, upload_time) VALUES(?, ?, ?, ?, ?);'
		await remove.db.run(sql, 'a94a8fe', 'test.txt', 'txt', 'testing', 26229139)
		await remove.db.run(sql, 'b05b9gf', 'main.cpp', 'cpp', 'testing', 26228731)

		const returnVal = await remove.removeExpiredFiles()

		expect(returnVal).toBe(0) // Check for successful execution

		expect(stubDate).toHaveBeenCalled() // Checks the stub was called

		// Restores Date.now() to its original functionality
		global.Date.now = originalDateCall

		done()
	})
})
