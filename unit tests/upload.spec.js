'use strict'

const fs = require('fs')
const Upload = require('../modules/upload.js')

describe('uploadFile()', () => {
	afterEach(() => {
		// Cleans up
		if (fs.existsSync('files/uploads/testing/dummy.txt')) {
			fs.unlinkSync('files/uploads/testing/dummy.txt')/*, err => {
				if (err) throw err
			})*/
		}
		if (fs.existsSync('files/uploads/testing')) {
			fs.rmdirSync('files/uploads/testing')/*, err => {
				if (err) throw err
			})*/
		}
	})

	test('file is uploaded to the server', async done => {
		expect.assertions(1)
		const upload = await new Upload()

		// Upload
		await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')

		// Check upload success
		const existing = fs.existsSync('files/uploads/testing/dummy.txt')
		expect(existing).toBeTruthy()

		done() // Finish the test
	})

	test('directory path is created if it does not exist', async done => {
		expect.assertions(2)
		const upload = await new Upload()

		// Checks that the folder does not exist
		if (fs.existsSync('files/uploads/testing')) {
			fs.rmdirSync('files/uploads/testing')
		}

		expect(fs.existsSync('files/uploads/testing')).toBeFalsy()

		// Upload file to directory and check directory was created
		await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')
		expect(fs.existsSync('files/uploads/testing')).toBeTruthy() // Checks that the folder was created successfully

		done()
	})

	test('directory path is not created if it already exists', async done => {
		expect.assertions(3)
		const upload = await new Upload()

		if (fs.existsSync('files/uploads/testing') === false) {
			// Creates the folder
			fs.mkdirSync('files/uploads/testing')
		}

		expect(fs.existsSync('files/uploads/testing')).toBeTruthy()

		// Upload file to directory
		await upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')

		// Checks that the folder was not removed
		expect(fs.existsSync('files/uploads/testing')).toBeTruthy()
		// Checks that the folder was not created inside the existing directory
		expect(fs.existsSync('files/uploads/testing/testing')).toBeFalsy()

		done()
	})
})
