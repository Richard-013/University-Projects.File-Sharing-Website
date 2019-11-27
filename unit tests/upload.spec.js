'use strict'

const fs = require('fs')
const mock = require('mock-fs')
const Upload = require('../modules/upload.js')

describe('uploadFile()', () => {
	beforeEach(() => {
		mock({
			'testing': {
				'dummy.txt': 'This file is for testing upload releated functionality'
			}
		})
	})

	afterEach(mock.restore)

	test('file is uploaded to the server', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()

		// Adds users to database
		let sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testing', 'unhackable')
		sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testTarget', 'beefyPassword2')
		const expectName = await upload.hashFileName('dummy.txt')

		// ACT
		// Upload
		const returnVal = await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing', 'testTarget')

		// ASSERT
		// Check upload success
		let existing = false
		await fs.stat(`files/uploads/testing/${expectName}.txt`, (err) => {
			if (err) throw err
		})
		existing = true // If stat executes successfully existing will be true, else an error is thrown before this line is executed

		expect(existing).toBeTruthy()

		// Checks return value was correct
		expect(returnVal).toBe(expectName)

		done() // Finish the test
	})

	test('directory path is created if it does not exist', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()

		// Adds users to database
		let sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testing', 'unhackable')
		sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testTarget', 'beefyPassword2')

		const expectName = await upload.hashFileName('dummy.txt')

		// ACT
		// Upload file to directory and check directory was created
		const returnVal = await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing', 'testTarget')

		// ASSERT
		let existing = false
		await fs.stat('files/uploads/testing', (err) => {
			if (err) throw err
		})
		existing = true

		expect(existing).toBeTruthy() // Checks that the folder was created successfully

		// Checks return value was correct
		expect(returnVal).toBe(expectName)
		done()
	})

	test('directory path is not created if it already exists', async done => {
		expect.assertions(4)
		// ARRANGE
		const upload = await new Upload()

		// Adds users to database
		let sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testing', 'unhackable')
		sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testTarget', 'beefyPassword2')

		// Creates the folder
		fs.mkdir('files/uploads/testing', { recursive: true }, err => {
			if (err) throw err
		})
		fs.writeFile('files/uploads/testing/exist.txt', 'This file exists', err => {
			if (err) throw err
		})

		let folderExists = false
		await fs.stat('files/uploads/testing', (err) => {
			if (err) throw err
		})
		folderExists = true
		expect(folderExists).toBeTruthy()

		const expectName = await upload.hashFileName('dummy.txt')

		// ACT
		// Upload file to directory
		const returnVal = await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing', 'testTarget')

		// ASSERT
		// Checks that the folder was not removed
		let existing = false
		await fs.stat('files/uploads/testing', (err) => {
			if (err) throw err
		})
		existing = true
		expect(existing).toBeTruthy()
		// Checks that the contents of the folder were not deleted
		let fileExists = false
		await fs.stat('files/uploads/testing/exist.txt', (err) => {
			if (err) throw err
		})
		fileExists = true
		expect(fileExists).toBeTruthy()
		// Checks return value was correct
		expect(returnVal).toBe(expectName)
		done()
	})

	test('handles no selected file and no stated path correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT AND ASSERT
		// Tests to see if the correct error is thrown when upload attempts
		await expect(upload.uploadFile(undefined, undefined, 'testing', 'testTarget')).rejects
			.toEqual(Error('No file or path specified for upload'))

		done() // Finish the test
	})

	test('handles no selected file correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT AND ASSERT
		// Tests to see if the correct error is thrown when upload attempts
		await expect(upload.uploadFile('testing/dummy.txt', undefined, 'testing', 'testTarget')).rejects
			.toEqual(Error('No file or path specified for upload'))

		done() // Finish the test
	})

	test('handles no stated path correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT AND ASSERT
		// Tests to see if the correct error is thrown when upload attempts
		await expect(upload.uploadFile(undefined, 'dummy.txt', 'testing', 'testTarget')).rejects
			.toEqual(Error('No file or path specified for upload'))

		done() // Finish the test
	})

	test('selected file does not exist', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()

		// Adds users to database
		let sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testing', 'unhackable')
		sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testTarget', 'beefyPassword2')

		// ACT AND ASSERT
		// Tests to see if the correct error is thrown when upload attempts
		await expect(upload.uploadFile('testing/alpha.txt', 'alpha.txt', 'testing', 'testTarget')).rejects
			.toEqual(Error('Selected file does not exist'))

		done() // Finish the test
	})

	test('user has already uploaded the file to the database', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()
		const hashName = await upload.hashFileName('dummy.txt')

		// Adds users to database
		let sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testing', 'unhackable')
		sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testTarget', 'beefyPassword2')

		// Adds file to the database
		const initialInsert = await upload.addToDB(hashName, 'dummy', 'txt', 'testing', 'testTarget')
		expect(initialInsert).toBe(0) // Checks that the initial insert had no issue

		// ACT AND ASSERT
		// Upload file which will attempt to add it to the database again
		await expect(upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing', 'testTarget')).rejects
			.toEqual(Error('User has already uploaded a file with the same name'))
		done()
	})

	test('database error occurs', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()

		// Adds users to database
		let sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testing', 'unhackable')
		sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testTarget', 'beefyPassword2')

		// Drops file table to cause db error
		sql = 'DROP TABLE IF EXISTS files;'
		await upload.db.run(sql)

		// ACT AND ASSERT
		// Upload attempt should detect a database error and respond accordingly
		await expect(upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing', 'testTarget')).rejects
			.toEqual(Error('Database error has occurred, please try again'))
		done()
	})

	test('responds correctly to an empty file name', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()

		// Adds users to database
		let sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testing', 'unhackable')
		sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testTarget', 'beefyPassword2')

		// ACT
		const returnVal = await upload.uploadFile('testing/', '', 'testing', 'testTarget')
		// ASSERT
		expect(returnVal[0]).toBe(1)
		expect(returnVal[1]).toBe('An error occurred whilst prepping your file for upload')

		done()
	})

	test('responds correctly to an undefined source username', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()

		// Adds target user to database
		const sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testTarget', 'beefyPassword2')

		// ACT AND ASSERT
		// Runs with undefined source username but valid target username
		await expect(upload.uploadFile('testing/test.txt', 'test.txt', undefined, 'testTarget')).rejects
			.toEqual(Error('Invalid user attempted upload'))

		done()
	})

	test('responds correctly to a non-existant source username', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()

		// Adds target user to database
		const sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testTarget', 'beefyPassword2')

		// ACT AND ASSERT
		// Runs with invalid source username but valid target username
		await expect(upload.uploadFile('testing/test.txt', 'test.txt', 'blarg', 'testTarget')).rejects
			.toEqual(Error('Invalid user attempted upload'))

		done()
	})

	test('responds correctly to an undefined target username', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()

		// Adds source user to database
		const sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testing', 'beefyPassword')

		// ACT AND ASSERT
		// Runs with valid source username but undefined target username
		await expect(upload.uploadFile('testing/test.txt', 'test.txt', 'testing', undefined)).rejects
			.toEqual(Error('Selected user does not exist'))

		done()
	})

	test('responds correctly to a non-existant target username', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()

		// Adds source user to database
		const sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testing', 'beefyPassword')

		// ACT AND ASSERT
		// Runs with valid source username but invalid target username
		await expect(upload.uploadFile('testing/test.txt', 'test.txt', 'testing', 'blorg')).rejects
			.toEqual(Error('Selected user does not exist'))

		done()
	})

	test('responds correctly to an undefined source and target username', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()

		// ACT AND ASSERT
		// Run uploadFile with no usernames
		await expect(upload.uploadFile('testing/test.txt', 'test.txt', undefined, undefined)).rejects
			.toEqual(Error('Invalid user attempted upload'))

		done()
	})

	test('responds correctly to a non-existant source and target username', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()

		// ACT AND ASSERT
		// Run uploadFile with non-existant usernames
		await expect(upload.uploadFile('testing/test.txt', 'test.txt', 'blarg', 'blorg')).rejects
			.toEqual(Error('Invalid user attempted upload'))

		done()
	})
})

describe('checkValidUser()', () => {
	test('returns true if user exists', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()

		// Inserts example user
		const sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'testUser', 'unhackablePassword')

		// ACT
		// Runs function
		const validUser = await upload.checkValidUser('testUser')

		// ASSERT
		// Checks output is true
		expect(validUser).toBeTruthy()

		done()
	})

	test('returns false if user does not exist', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()

		const sql = 'INSERT INTO users(user, pass) VALUES(?, ?);'
		await upload.db.run(sql, 'totallyNotAUser', 'SortOfAPassword')

		// ACT
		// Runs function with no users in db
		const validUser = await upload.checkValidUser('testUser')

		// ASSERT
		// Checks output is false
		expect(validUser).toBeFalsy()

		done()
	})

	test('returns false if there is a database error', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()

		// Set up database for an error
		const sql = 'DROP TABLE IF EXISTS users;'
		await upload.db.run(sql)

		// ACT
		// Runs function with no db
		const validUser = await upload.checkValidUser('testUser')

		// ASSERT
		// Checks output is false
		expect(validUser).toBeFalsy()

		done()
	})

	test('returns false if user is undefined', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()

		// ACT
		// Runs function with no users in db
		const validUser = await upload.checkValidUser(undefined)

		// ASSERT
		// Checks output is false
		expect(validUser).toBeFalsy()

		done()
	})
})

describe('generateFileDetails()', () => {
	test('generates file details correctly', async done => {
		expect.assertions(3)
		// ARRANGE
		const upload = await new Upload()

		// ACT
		const fileDetails = await upload.generateFileDetails('test.txt')
		// ASSERT
		expect(fileDetails[0]).toBe('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3.txt')
		expect(fileDetails[1]).toBe('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		expect(fileDetails[2]).toBe('txt')

		done()
	})

	test('returns correct code if no file name is given', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		const fileDetails = await upload.generateFileDetails()
		// ASSERT
		expect(fileDetails).toBe(1)

		done()
	})

	test('returns correct code if something goes wrong while prepping the file details', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		const fileDetails = await upload.generateFileDetails('a')
		// ASSERT
		expect(fileDetails).toBe(1)

		done()
	})
})

describe('checkUploadRes()', () => {
	test('handles a successful upload code correctly', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		const serverMessage = await upload.checkUploadRes(0, 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		// ASSERT
		expect(serverMessage[0]).toBe(0)
		expect(serverMessage[1]).toBe('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')

		done()
	})

	test('handles no hash correctly', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		const serverMessage = await upload.checkUploadRes(0)
		// ASSERT
		expect(serverMessage[0]).toBe(1)
		expect(serverMessage[1]).toBe('No hashID given')

		done()
	})

	test('handles empty hash correctly', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		const serverMessage = await upload.checkUploadRes(0, '')
		// ASSERT
		expect(serverMessage[0]).toBe(1)
		expect(serverMessage[1]).toBe('No hashID given')

		done()
	})

	test('handles a repeated file name code correctly', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		const serverMessage = await upload.checkUploadRes(-2, 'a94a')
		// ASSERT
		expect(serverMessage[0]).toBe(1)
		expect(serverMessage[1]).toBe('User has already uploaded a file with the same name')

		done()
	})

	test('handles a database error code correctly', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		const serverMessage = await upload.checkUploadRes(-3, 'a94a')
		// ASSERT
		expect(serverMessage[0]).toBe(1)
		expect(serverMessage[1]).toBe('Database error has occurred, please try again')

		done()
	})

	test('handles no status code being given correctly', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		const serverMessage = await upload.checkUploadRes()
		// ASSERT
		expect(serverMessage[0]).toBe(1)
		expect(serverMessage[1]).toBe('Something went wrong')

		done()
	})

	test('handles only being given a hash correctly', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		const serverMessage = await upload.checkUploadRes('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		// ASSERT
		expect(serverMessage[0]).toBe(1)
		expect(serverMessage[1]).toBe('Something went wrong')

		done()
	})

	test('handles status code being passed a string', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		const serverMessage = await upload.checkUploadRes('Status: Bad', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		// ASSERT
		expect(serverMessage[0]).toBe(1)
		expect(serverMessage[1]).toBe('Something went wrong')

		done()
	})
})

describe('hashFileName()', () => {
	test('gets file name without extension', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		const returnVal = await upload.hashFileName('testing.txt')
		// ASSERT
		expect(returnVal).toBe('dc724af18fbdd4e59189f5fe768a5f8311527050')

		done() // Finish the test
	})

	test('correct error is thrown when file doesn\'t have an extension', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT AND ASSERT
		// Checks correct error is thrown when function is called with wrong argument
		await expect(upload.hashFileName('testing')).rejects
			.toEqual(Error('File name is invalid: No extension found (fileName)'))

		done()
	})

	test('correct error is thrown when no file name is given', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT AND ASSERT
		// Checks correct error is thrown when function is called with wrong argument
		await expect(upload.hashFileName()).rejects
			.toEqual(Error('No file name passed (fileName)'))

		done()
	})
})

describe('getExtension()', () => {
	test('gets extension from the file', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		const returnVal = await upload.getExtension('testing.txt')
		// ASSERT
		expect(returnVal).toBe('txt')

		done() // Finish the test
	})

	test('correct error is thrown when file doesn\'t have an extension', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT AND ASSERT
		// Checks correct error is thrown when function is called with wrong argument
		await expect(upload.getExtension('testing')).rejects
			.toEqual(Error('File name is invalid: No extension found (getExtension)'))

		done()
	})

	test('correct error is thrown when no file name is given', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT AND ASSERT
		// Checks correct error is thrown when function is called with wrong argument
		await expect(upload.getExtension()).rejects
			.toEqual(Error('No file name passed (getExtension)'))

		done()
	})

	test('gets correct extension when there are multiple present', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		// Runs the function on a file name with multiple extensions
		const returnVal = await upload.getExtension('testing.txt.zip')
		// ASSERT
		expect(returnVal).toBe('zip')

		done()
	})
})

describe('addToDB()', () => {
	test('adds records to the database', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		const returnVal = await upload.addToDB('123abc', 'dummy', 'txt', 'testing', 'testTarget')
		// ASSERT
		expect(returnVal).toBe(0)
		done()
	})

	test('checks correct code is returned when a duplicate file is added', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()
		// Uploads the file for the first time
		const returnVal1 = await upload.addToDB('123abc', 'dummy', 'txt', 'testing', 'testTarget')
		expect(returnVal1).toBe(0)

		// ACT
		const returnVal2 = await upload.addToDB('123abc', 'dummy', 'txt', 'testing', 'testTarget')
		// ASSERT
		expect(returnVal2).toBe(-2)
		done()
	})

	test('checks correct code is returned there is a data or database issue', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()

		// Break database
		const sql = 'DROP TABLE IF EXISTS files;'
		await upload.db.run(sql)

		// ACT
		// Attempt upload
		const returnVal = await upload.addToDB('123abc', 'dummy', 'txt', 'testing', 'testTarget')
		// ASSERT
		expect(returnVal).toBe(-3)

		done()
	})

	test('checks correct time is added to the database', async done => {
		expect.assertions(3)
		// ARRANGE
		const upload = await new Upload()

		// Stubs Date.now() calls so they return 1574007598432 every time
		const originalDateCall = Date.now.bind(global.Date)
		const stubDate = jest.fn(() => 1574007598432)
		global.Date.now = stubDate

		// ACT
		const returnVal = await upload.addToDB('123abc', 'dummy', 'txt', 'testing', 'testTarget')
		// ASSERT
		// Checks return value of the function
		expect(returnVal).toBe(0)
		expect(stubDate).toHaveBeenCalled()

		const sql = 'SELECT * FROM files WHERE hash_id = "123abc";'
		const data = await upload.db.get(sql)

		expect(data.upload_time).toBe(26233459)

		// Restores Date.now() to its original functionality
		global.Date.now = originalDateCall
		done()
	})

	test('handles undefined hashID correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		// Checks correct code is given when function is called with wrong argument
		const returnVal = await upload.addToDB(undefined, 'dummy', 'txt', 'testing', 'testTarget')
		// ASSERT
		expect(returnVal).toBe(-3)
		done()
	})

	test('handles undefined file name correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		// Checks correct code is given when function is called with wrong argument
		const returnVal = await upload.addToDB('abc123', undefined, 'txt', 'testing', 'testTarget')
		// ASSERT
		expect(returnVal).toBe(-3)
		done()
	})

	test('handles undefined extension correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		// Checks correct code is given when function is called with wrong argument
		const returnVal = await upload.addToDB('abc123', 'dummy', undefined, 'testing', 'testTarget')
		// ASSERT
		expect(returnVal).toBe(-3)
		done()
	})

	test('handles undefined source username correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		// Checks correct code is given when function is called with wrong argument
		const returnVal = await upload.addToDB('abc123', 'dummy', 'txt', undefined, 'testTarget')
		// ASSERT
		expect(returnVal).toBe(-3)
		done()
	})

	test('handles undefined target username correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		// Checks correct code is given when function is called with wrong argument
		const returnVal = await upload.addToDB('abc123', 'dummy', 'txt', 'testing', undefined)
		// ASSERT
		expect(returnVal).toBe(-3)
		done()
	})

	test('handles no arguments eing given correctly correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const upload = await new Upload()
		// ACT
		// Checks correct code is given when function is called with no arguments
		const returnVal = await upload.addToDB()
		// ASSERT
		expect(returnVal).toBe(-3)
		done()
	})
})

describe('getUploadTime()', () => {
	test('gets the correct time in minutes', async done => {
		expect.assertions(2)
		// ARRANGE
		const upload = await new Upload()

		// Stubs Date.now() calls so they return 1574007598432 every time
		const originalDateCall = Date.now.bind(global.Date)
		const stubDate = jest.fn(() => 1574007598432)
		global.Date.now = stubDate

		// ACT
		const time = await upload.getUploadTime()
		// ASSERT
		expect(time).toBe(26233459)
		expect(stubDate).toHaveBeenCalled() // Checks the stub was called

		// Restores Date.now() to its original functionality
		global.Date.now = originalDateCall
		done()
	})
})
