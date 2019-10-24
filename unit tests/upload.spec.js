'use strict'

const fs = require('fs')
const mock = require('mock-fs')
const Upload = require('../modules/upload.js')

describe('uploadFile()', () => {
	beforeEach(() => {
		mock({
			'testing': {
				'dummy.txt': 'file content here'
			}
		})
	})

	afterEach(mock.restore)

	test('file is uploaded to the server', async done => {
		expect.assertions(2)
		const upload = await new Upload()

		// Upload
		const returnVal = await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')
		const expectName = await upload.hashFileName('dummy.txt')
		// Check upload success
		const existing = fs.existsSync(`files/uploads/testing/${expectName}.txt`)
		expect(existing).toBeTruthy()
		// Checks return value was correct
		expect(returnVal).toBe(0)

		done() // Finish the test
	})

	test('directory path is created if it does not exist', async done => {
		expect.assertions(3)
		const upload = await new Upload()

		// Checks that the folder does not exist
		if (fs.existsSync('files/uploads/testing')) {
			fs.rmdirSync('files/uploads/testing', { recursive: true })
		}

		expect(fs.existsSync('files/uploads/testing')).toBeFalsy()

		// Upload file to directory and check directory was created
		const returnVal = await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')
		expect(fs.existsSync('files/uploads/testing')).toBeTruthy() // Checks that the folder was created successfully
		// Checks return value was correct
		expect(returnVal).toBe(0)
		done()
	})

	test('directory path is not created if it already exists', async done => {
		expect.assertions(4)
		const upload = await new Upload()

		if (fs.existsSync('files/uploads/testing') === false) {
			// Creates the folder
			fs.mkdirSync('files/uploads/testing', { recursive: true })
		}

		expect(fs.existsSync('files/uploads/testing')).toBeTruthy()

		// Upload file to directory
		const returnVal = await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')

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
		const upload = await new Upload()
		const returnVal = await upload.uploadFile(undefined, undefined, 'testing')
		
		// Tests to see if the correct error is thrown when upload attempts
		expect(returnVal).toBe(1)

		done() // Finish the test
	})

	test('handles no selected file correctly', async done => {
		expect.assertions(1)
		const upload = await new Upload()
		const returnVal = await upload.uploadFile('testing/dummy.txt', undefined, 'testing')
		
		// Tests to see if the correct error is thrown when upload attempts
		expect(returnVal).toBe(1)

		done() // Finish the test
	})

	test('handles no stated path correctly', async done => {
		expect.assertions(1)
		const upload = await new Upload()
		const returnVal = await upload.uploadFile(undefined, 'dummy.txt', 'testing')
		
		// Tests to see if the correct error is thrown when upload attempts
		expect(returnVal).toBe(1)

		done() // Finish the test
	})

	test('selected file does not exist', async done => {
		expect.assertions(1)
		const upload = await new Upload()
		const returnVal = await upload.uploadFile('testing/alpha.txt', 'alpha.txt', 'testing')
		
		// Tests to see if the correct error is thrown when upload attempts
		expect(returnVal).toBe(-1)

		done() // Finish the test
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
})

describe('getExtension()', () => {
	test('gets extension from the file', async done => {
		expect.assertions(1)
		const upload = await new Upload()
		const returnVal = await upload.getExtension('testing.txt')

		expect(returnVal).toBe('txt')

		done() // Finish the test
	})
})
