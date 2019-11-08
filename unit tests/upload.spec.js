'use strict'

const fs = require('fs')
const mock = require('mock-fs')
const sqlite = require('sqlite-async')
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
		expect.assertions(3)
		const upload = await new Upload()

		// Upload
		const returnVal = await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')
		const expectName = await upload.hashFileName('dummy.txt')
		// Check upload success
		const existing = fs.existsSync(`files/uploads/testing/${expectName}.txt`)
		expect(existing).toBeTruthy()
		// Checks return value was correct
		expect(returnVal[0]).toBe(0)
		expect(returnVal[1]).toBe(expectName)

		done() // Finish the test
	})

	test('directory path is created if it does not exist', async done => {
		expect.assertions(4)
		const upload = await new Upload()

		// Checks that the folder does not exist
		if (fs.existsSync('files/uploads/testing')) {
			fs.rmdirSync('files/uploads/testing', { recursive: true })
		}

		expect(fs.existsSync('files/uploads/testing')).toBeFalsy()
		const expectName = await upload.hashFileName('dummy.txt')

		// Upload file to directory and check directory was created
		const returnVal = await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')
		expect(fs.existsSync('files/uploads/testing')).toBeTruthy() // Checks that the folder was created successfully
		// Checks return value was correct
		expect(returnVal[0]).toBe(0)
		expect(returnVal[1]).toBe(expectName)
		done()
	})

	test('directory path is not created if it already exists', async done => {
		expect.assertions(5)
		const upload = await new Upload()

		if (fs.existsSync('files/uploads/testing') === false) {
			// Creates the folder
			fs.mkdirSync('files/uploads/testing', { recursive: true })
		}

		expect(fs.existsSync('files/uploads/testing')).toBeTruthy()

		// Upload file to directory
		const returnVal = await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')
		const expectName = await upload.hashFileName('dummy.txt')

		// Checks that the folder was not removed
		expect(fs.existsSync('files/uploads/testing')).toBeTruthy()
		// Checks that the folder was not created inside the existing directory
		expect(fs.existsSync('files/uploads/testing/testing')).toBeFalsy()
		// Checks return value was correct
		expect(returnVal[0]).toBe(0)
		expect(returnVal[1]).toBe(expectName)
		done()
	})

	test('handles no selected file and no stated path correctly', async done => {
		expect.assertions(2)
		const upload = await new Upload()
		const returnVal = await upload.uploadFile(undefined, undefined, 'testing')
		// Tests to see if the correct error is thrown when upload attempts
		expect(returnVal[0]).toBe(1)
		expect(returnVal[1]).toBe('No file or path specified for upload')

		done() // Finish the test
	})

	test('handles no selected file correctly', async done => {
		expect.assertions(2)
		const upload = await new Upload()
		const returnVal = await upload.uploadFile('testing/dummy.txt', undefined, 'testing')
		
		// Tests to see if the correct error is thrown when upload attempts
		expect(returnVal[0]).toBe(1)
		expect(returnVal[1]).toBe('No file or path specified for upload')

		done() // Finish the test
	})

	test('handles no stated path correctly', async done => {
		expect.assertions(2)
		const upload = await new Upload()
		const returnVal = await upload.uploadFile(undefined, 'dummy.txt', 'testing')
		
		// Tests to see if the correct error is thrown when upload attempts
		expect(returnVal[0]).toBe(1)
		expect(returnVal[1]).toBe('No file or path specified for upload')

		done() // Finish the test
	})

	test('selected file does not exist', async done => {
		expect.assertions(2)
		const upload = await new Upload()
		const returnVal = await upload.uploadFile('testing/alpha.txt', 'alpha.txt', 'testing')
		
		// Tests to see if the correct error is thrown when upload attempts
		expect(returnVal[0]).toBe(1)
		expect(returnVal[1]).toBe('Selected file does not exist')

		done() // Finish the test
	})

	test('user has already uploaded the file to the database', async done => {
		expect.assertions(3)
		const upload = await new Upload()
		const hashName = await upload.hashFileName('dummy.txt')
		
		// Adds file to the database
		const initialInsert = await upload.addToDB(hashName, 'dummy', 'txt', 'testing')
		expect(initialInsert).toBe(0)

		// Upload file which will attempt to add it to the database again
		const returnVal = await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')
		expect(returnVal[0]).toBe(1)
		expect(returnVal[1]).toBe('User has already uploaded a file with the same name')

		done()
	})

	test('database error occurs', async done => {
		expect.assertions(2)
		const upload = await new Upload()

		const sql = 'DROP TABLE IF EXISTS files;'
		await upload.db.run(sql)

		// Upload attempt should detect a database error and respond accordingly
		const returnVal = await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')
		expect(returnVal[0]).toBe(1)
		expect(returnVal[1]).toBe('Database error has occurred, please try again')

		done()
	})

	test('responds correctly to an empty file name', async done => {
		expect.assertions(2)
		const upload = await new Upload()

		const returnVal = await upload.uploadFile('testing/', '', 'testing')
		expect(returnVal[0]).toBe(1)
		expect(returnVal[1]).toBe('An error occurred whilst prepping your file for upload')

		done()
	})
})

describe('generateFileDetails()', () => {
	test('generates file details correctly', async done => {
		expect.assertions(3)
		const upload = await new Upload()

		const fileDetails = await upload.generateFileDetails('test.txt')
		expect(fileDetails[0]).toBe('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3.txt')
		expect(fileDetails[1]).toBe('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		expect(fileDetails[2]).toBe('txt')

		done()
	})

	test('returns correct code if no file name is given', async done => {
		expect.assertions(1)
		const upload = await new Upload()

		const fileDetails = await upload.generateFileDetails()
		expect(fileDetails).toBe(1)

		done()
	})

	test('returns correct code if something goes wrong while prepping the file details', async done => {
		expect.assertions(1)
		const upload = await new Upload()

		const fileDetails = await upload.generateFileDetails('a')
		expect(fileDetails).toBe(1)

		done()
	})
})

describe('checkUploadRes()', () => {
	test('handles a successful upload code correctly', async done => {
		expect.assertions(2)
		const upload = await new Upload()
		
		const serverMessage = await upload.checkUploadRes(0, 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		expect(serverMessage[0]).toBe(0)
		expect(serverMessage[1]).toBe('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')

		done()
	})

	test('handles no hash correctly', async done => {
		expect.assertions(2)
		const upload = await new Upload()

		const serverMessage = await upload.checkUploadRes(0)
		expect(serverMessage[0]).toBe(0)
		expect(serverMessage[1]).toBe('No hashID given')

		done()
	})

	test('handles empty hash correctly', async done => {
		expect.assertions(2)
		const upload = await new Upload()

		const serverMessage = await upload.checkUploadRes(0, '')
		expect(serverMessage[0]).toBe(0)
		expect(serverMessage[1]).toBe('No hashID given')

		done()
	})

	test('handles a repeated file name code correctly', async done => {
		expect.assertions(2)
		const upload = await new Upload()

		const serverMessage = await upload.checkUploadRes(-2, 'a94a')
		expect(serverMessage[0]).toBe(1)
		expect(serverMessage[1]).toBe('User has already uploaded a file with the same name')

		done()
	})

	test('handles a database error code correctly', async done => {
		expect.assertions(2)
		const upload = await new Upload()

		const serverMessage = await upload.checkUploadRes(-3, 'a94a')
		expect(serverMessage[0]).toBe(1)
		expect(serverMessage[1]).toBe('Database error has occurred, please try again')

		done()
	})

	test('handles no status code being given correctly', async done => {
		expect.assertions(2)
		const upload = await new Upload()

		const serverMessage = await upload.checkUploadRes()
		expect(serverMessage[0]).toBe(1)
		expect(serverMessage[1]).toBe('Something went wrong')

		done()
	})

	test('handles only being given a hash correctly', async done => {
		expect.assertions(2)
		const upload = await new Upload()

		const serverMessage = await upload.checkUploadRes('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		expect(serverMessage[0]).toBe(1)
		expect(serverMessage[1]).toBe('Something went wrong')

		done()
	})
})

describe('hashFileName()', () => {
	test('gets file name without extension', async done => {
		expect.assertions(1)
		const upload = await new Upload()
		const returnVal = await upload.hashFileName('testing.txt')

		expect(returnVal).toBe('dc724af18fbdd4e59189f5fe768a5f8311527050')

		done() // Finish the test
	})

	test('correct error is thrown when file doesn\'t have an extension', async done => {
		expect.assertions(1)
		const upload = await new Upload()
		// Checks correct error is thrown when function is called with wrong argument
		await expect(upload.hashFileName('testing')).rejects
			.toEqual(Error('File name is invalid: No extension found (fileName)'))

		done()
	})

	test('correct error is thrown when no file name is given', async done => {
		expect.assertions(1)
		const upload = await new Upload()
		// Checks correct error is thrown when function is called with wrong argument
		await expect(upload.hashFileName()).rejects
			.toEqual(Error('No file name passed (fileName)'))

		done()
	})
})

describe('getExtension()', () => {
	test('gets extension from the file', async done => {
		expect.assertions(1)
		const upload = await new Upload()
		const returnVal = await upload.getExtension('testing.txt')

		expect(returnVal).toBe('txt')

		done() // Finish the test
	})

	test('correct error is thrown when file doesn\'t have an extension', async done => {
		expect.assertions(1)
		const upload = await new Upload()
		// Checks correct error is thrown when function is called with wrong argument
		await expect(upload.getExtension('testing')).rejects
			.toEqual(Error('File name is invalid: No extension found (getExtension)'))

		done()
	})

	test('correct error is thrown when no file name is given', async done => {
		expect.assertions(1)
		const upload = await new Upload()
		// Checks correct error is thrown when function is called with wrong argument
		await expect(upload.getExtension()).rejects
			.toEqual(Error('No file name passed (getExtension)'))

		done()
	})

	test('gets correct extension when there are multiple present', async done => {
		expect.assertions(1)
		const upload = await new Upload()
		// Runs the function on a file name with multiple extensions
		const returnVal = await upload.getExtension('testing.txt.zip')

		expect(returnVal).toBe('zip')

		done()
	})
})

describe('addToDB()', () => {
	test('adds records to the database', async done => {
		// Tests to see if records are successfully added to the database
		expect.assertions(1)
		const upload = await new Upload()
		const returnVal = await upload.addToDB('123abc', 'dummy', 'txt', 'testing')
		// Checks return value of the function
		expect(returnVal).toBe(0)
		done()
	})

	test('checks correct code is returned when a duplicate file is added', async done => {
		// Tests to see if records are successfully added to the database
		expect.assertions(2)
		const upload = await new Upload()
		// Uploads the file for the first time
		const returnVal1 = await upload.addToDB('123abc', 'dummy', 'txt', 'testing')
		expect(returnVal1).toBe(0)

		const returnVal2 = await upload.addToDB('123abc', 'dummy', 'txt', 'testing')
		expect(returnVal2).toBe(-2)
		done()
	})

	test('checks correct code is returned there is a data or database issue', async done => {
		// Tests to see if records are successfully added to the database
		expect.assertions(1)
		const upload = await new Upload()
		// Uploads the file for the first time
		const returnVal = await upload.addToDB()
		expect(returnVal).toBe(-3)

		done()
	})
})
