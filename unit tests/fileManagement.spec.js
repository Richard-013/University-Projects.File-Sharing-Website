'use strict'

const fs = require('fs')
const mock = require('mock-fs')
const FileManagement = require('../modules/fileManagement.js')

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
		const uploadManager = await new FileManagement()

		// Upload
		const returnVal = await uploadManager.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')
		const expectName = await uploadManager.hashFileName('dummy.txt')
		// Check upload success
		const existing = fs.existsSync(`files/uploads/testing/${expectName}.txt`)
		expect(existing).toBeTruthy()
		// Checks return value was correct
		expect(returnVal).toBe(0)

		done() // Finish the test
	})

	test('directory path is created if it does not exist', async done => {
		expect.assertions(3)
		const uploadManager = await new FileManagement()

		// Checks that the folder does not exist
		if (fs.existsSync('files/uploads/testing')) {
			fs.rmdirSync('files/uploads/testing', { recursive: true })
		}

		expect(fs.existsSync('files/uploads/testing')).toBeFalsy()

		// Upload file to directory and check directory was created
		const returnVal = await uploadManager.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')
		expect(fs.existsSync('files/uploads/testing')).toBeTruthy() // Checks that the folder was created successfully
		// Checks return value was correct
		expect(returnVal).toBe(0)
		done()
	})

	test('directory path is not created if it already exists', async done => {
		expect.assertions(4)
		const uploadManager = await new FileManagement()

		if (fs.existsSync('files/uploads/testing') === false) {
			// Creates the folder
			fs.mkdirSync('files/uploads/testing', { recursive: true })
		}

		expect(fs.existsSync('files/uploads/testing')).toBeTruthy()

		// Upload file to directory
		const returnVal = await uploadManager.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')

		// Checks that the folder was not removed
		expect(fs.existsSync('files/uploads/testing')).toBeTruthy()
		// Checks that the folder was not created inside the existing directory
		expect(fs.existsSync('files/uploads/testing/testing')).toBeFalsy()
		// Checks return value was correct
		expect(returnVal).toBe(0)
		done()
	})

	test('handles no selected file and no stated path correctly', async done => {
		expect.assertions(1)
		const uploadManager = await new FileManagement()
		const returnVal = await uploadManager.uploadFile(undefined, undefined, 'testing')
		// Tests to see if the correct error is thrown when upload attempts
		expect(returnVal).toBe(1)

		done() // Finish the test
	})

	test('handles no selected file correctly', async done => {
		expect.assertions(1)
		const uploadManager = await new FileManagement()
		const returnVal = await uploadManager.uploadFile('testing/dummy.txt', undefined, 'testing')
		
		// Tests to see if the correct error is thrown when upload attempts
		expect(returnVal).toBe(1)

		done() // Finish the test
	})

	test('handles no stated path correctly', async done => {
		expect.assertions(1)
		const uploadManager = await new FileManagement()
		const returnVal = await uploadManager.uploadFile(undefined, 'dummy.txt', 'testing')
		
		// Tests to see if the correct error is thrown when upload attempts
		expect(returnVal).toBe(1)

		done() // Finish the test
	})

	test('selected file does not exist', async done => {
		expect.assertions(1)
		const uploadManager = await new FileManagement()
		const returnVal = await uploadManager.uploadFile('testing/alpha.txt', 'alpha.txt', 'testing')
		
		// Tests to see if the correct error is thrown when upload attempts
		expect(returnVal).toBe(-1)

		done() // Finish the test
	})

	test('user has already uploaded the file to the database', async done => {
		expect.assertions(2)
		const uploadManager = await new FileManagement()
		const hashName = await uploadManager.hashFileName('dummy.txt')
		
		// Adds file to the database
		const initialInsert = await uploadManager.addToDB(hashName, 'dummy', 'txt', 'testing')
		expect(initialInsert).toBe(0)

		// Upload file which will attempt to add it to the database again
		const returnVal = await uploadManager.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')
		expect(returnVal).toBe(-2)

		done()
	})
})

describe('hashFileName()', () => {
	test('gets file name without extension', async done => {
		expect.assertions(1)
		const uploadManager = await new FileManagement()
		const returnVal = await uploadManager.hashFileName('testing.txt')

		expect(returnVal).toBe('dc724af18fbdd4e59189f5fe768a5f8311527050')

		done() // Finish the test
	})

	test('correct error is thrown when file doesn\'t have an extension', async done => {
		expect.assertions(1)
		const uploadManager = await new FileManagement()
		// Checks correct error is thrown when function is called with wrong argument
		await expect(uploadManager.hashFileName('testing')).rejects
			.toEqual(Error('File name is invalid: No extension found (fileName)'))

		done()
	})

	test('correct error is thrown when no file name is given', async done => {
		expect.assertions(1)
		const uploadManager = await new FileManagement()
		// Checks correct error is thrown when function is called with wrong argument
		await expect(uploadManager.hashFileName()).rejects
			.toEqual(Error('No file name passed (fileName)'))

		done()
	})
})

describe('getExtension()', () => {
	test('gets extension from the file', async done => {
		expect.assertions(1)
		const uploadManager = await new FileManagement()
		const returnVal = await uploadManager.getExtension('testing.txt')

		expect(returnVal).toBe('txt')

		done() // Finish the test
	})

	test('correct error is thrown when file doesn\'t have an extension', async done => {
		expect.assertions(1)
		const uploadManager = await new FileManagement()
		// Checks correct error is thrown when function is called with wrong argument
		await expect(uploadManager.getExtension('testing')).rejects
			.toEqual(Error('File name is invalid: No extension found (getExtension)'))

		done()
	})

	test('correct error is thrown when no file name is given', async done => {
		expect.assertions(1)
		const uploadManager = await new FileManagement()
		// Checks correct error is thrown when function is called with wrong argument
		await expect(uploadManager.getExtension()).rejects
			.toEqual(Error('No file name passed (getExtension)'))

		done()
	})

	test('gets correct extension when there are multiple present', async done => {
		expect.assertions(1)
		const uploadManager = await new FileManagement()
		// Runs the function on a file name with multiple extensions
		const returnVal = await uploadManager.getExtension('testing.txt.zip')

		expect(returnVal).toBe('zip')

		done()
	})
})

describe('addToDB()', () => {
	test('adds records to the database', async done => {
		// Tests to see if records are successfully added to the database
		expect.assertions(1)
		const uploadManager = await new FileManagement()
		const returnVal = await uploadManager.addToDB('123abc', 'dummy', 'txt', 'testing')
		// Checks return value of the function
		expect(returnVal).toBe(0)
		done()
	})

	test('checks correct code is returned when a duplicate file is added', async done => {
		// Tests to see if records are successfully added to the database
		expect.assertions(2)
		const uploadManager = await new FileManagement()
		// Uploads the file for the first time
		const returnVal1 = await uploadManager.addToDB('123abc', 'dummy', 'txt', 'testing')
		expect(returnVal1).toBe(0)

		const returnVal2 = await uploadManager.addToDB('123abc', 'dummy', 'txt', 'testing')
		expect(returnVal2).toBe(-2)
		done()
	})

	test('checks correct code is returned there is a data or database issue', async done => {
		// Tests to see if records are successfully added to the database
		expect.assertions(1)
		const uploadManager = await new FileManagement()
		// Uploads the file for the first time
		const returnVal = await uploadManager.addToDB()
		expect(returnVal).toBe(-3)

		done()
	})
})

describe('getFilePath()', () => {

	beforeEach(() => {
		mock({
			'testing': {
				'test.txt': 'This file is for testing download related functionality'
			}
		})
	})

	afterEach(mock.restore)

	test('gets the file path to the requested resource', async done => {
		expect.assertions(1)
		const downloadManager = await new FileManagement()
		// Upload file to test with
		await downloadManager.uploadFile('testing/test.txt', 'test.txt', 'tester')
		// Get path to the file
		const returnVal = await downloadManager.getFilePath('tester', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')

		expect(returnVal).toBe('files/uploads/tester/a94a8fe5ccb19ba61c4c0873d391e987982fbbd3.txt')

		done() // Finish the test
	})

	test('throws correct error when there is no username', async done => {
		expect.assertions(1)
		const downloadManager = await new FileManagement()

		await expect(downloadManager.getFilePath(undefined, 'a94a8fe5')).rejects
			.toEqual(Error('No username given, file cannot be located'))

		done()
	})

	test('throws correct error when there is no hash name', async done => {
		expect.assertions(1)
		const downloadManager = await new FileManagement()

		await expect(downloadManager.getFilePath('tester', undefined)).rejects
			.toEqual(Error('No file name given, file cannot be located'))

		done()
	})

	test('throws correct error when the file does not exist', async done => {
		expect.assertions(1)
		const downloadManager = await new FileManagement()

		await expect(downloadManager.getFilePath('tester', '5p00p5')).rejects
			.toEqual(Error('Requested file could not be found'))

		done()
	})
})
