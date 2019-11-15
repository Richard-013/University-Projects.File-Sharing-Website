'use strict'

const Remove = require('../modules/remove.js')
const fs = require('fs')
const mock = require('mock-fs')

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
		const returnVal = await remove.removeFileFromServer('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'txt')

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

		const returnVal = remove.removeFileFromDB('testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		checkDB = await remove.db.get(sqlSelect, 'testing', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')

		// Test if removal was a success
		expect(checkDB.records).toBe(0)
		expect(returnVal).toBe(0)

		done() // Finish the test
	})
})
