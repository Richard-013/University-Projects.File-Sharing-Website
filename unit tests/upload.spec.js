'use strict'

const fs = require('fs') // Replace this and all fs function calls with mock of fs
const Upload = require('../modules/upload.js')

describe('uploadFile()', () => {
	test('file is uploaded to the server', async done => {
		expect.assertions(1)
		const upload = await new Upload()

		// Create dummy file
		const text = 'This is a file to test the uploadFile function'
		await fs.writeFile('testing/dummy.txt', text, err => {
			if (err) throw err
		})

		// Upload
		upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')

		// Check upload success
		const existing = fs.existsSync('testing/dummy.txt')
		expect(existing).toBeTruthy()

		// Delete dummy file from uploads and from test folder
		await fs.unlink('testing/dummy.txt', err => {
			if (err) throw err
		})
		await fs.unlink('files/uploads/testing/dummy.txt', err => {
			if (err) throw err
		})
		await fs.rmdir('files/uploads/testing', err => {
			if (err) throw err
		})

		done() // Finish the test
	})

	test('directory path is created if it does not exist', async done => {
		expect.assertions(2)
		const upload = await new Upload()

		// Creates file to use as dummy upload
		const text = 'This is a file to test the uploadFile function'
		await fs.writeFile('testing/dummy.txt', text, err => {
			if (err) throw err
		})

		// Checks that the folder does not exist
		if (fs.existsSync('files/uploads/testing')) {
			fs.rmdirSync('files/uploads/testing')
		}

		expect(fs.existsSync('files/uploads/testing')).toBeFalsy()

		// Upload file to directory and check directory was created
		upload.uploadFile('testing/dummy.txt', 'dummy.txt', 'testing')
		expect(fs.existsSync('files/uploads/testing')).toBeTruthy() // Checks that the folder was created successfully

		// Deletes files after test
		await fs.unlink('testing/dummy.txt', err => {
			if (err) throw err
		})
		await fs.unlink('files/uploads/testing/dummy.txt', err => {
			if (err) throw err
		})
		await fs.rmdir('files/uploads/testing', err => {
			if (err) throw err
		})

		done()
	})

		done()
	})
})
