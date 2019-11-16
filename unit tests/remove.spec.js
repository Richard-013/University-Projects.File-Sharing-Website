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

	test('handles null extension correctly when a db error occurs before extension is retrieved', async done => {
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
	test('file exists so return true', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		if (!fs.existsSync('files/uploads/test')) fs.mkdirSync('files/uploads/test', { recursive: true })
		await fs.writeFile('files/uploads/test/a94a8fe5.txt', 'test file', err => {
			if (err) throw err
		})

		expect(remove.doesFileExist('test', 'a94a8fe5', 'txt')).toBeTruthy()

		fs.unlinkSync('files/uploads/test/a94a8fe5.txt')
		done()
	})

	test('file does not exist so return false', async done => {
		expect.assertions(1)
		const remove = await new Remove()
		fs.mkdirSync('files/uploads/testing2', { recursive: true })
		expect(await remove.doesFileExist('testing2', 'a94a8fe', 'txt')).toBeFalsy()
		fs.removeSync('files/uploads/testing2')
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

	test('returns null if an error occurs', async done => {
		expect.assertions(1)
		const remove = await new Remove()

		// Remove the table to cause db error
		const sql = 'DROP TABLE IF EXISTS files;'
		await remove.db.run(sql)

		const extension = await remove.getExtension('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		expect(extension).toBe(null)
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
