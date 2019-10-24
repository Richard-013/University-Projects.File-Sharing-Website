'use strict'

const fs = require('fs')
const mock = require('mock-fs')
const Download = require('../modules/download.js')

describe('uploadFile()', () => {
	beforeEach(() => {
		mock({
			'testing': {
				'dummy.txt': 'file content here'
			}
		})
	})

	afterEach(mock.restore)

	test('file is downloaded from the server', async done => {
		expect.assertions(1)
		const download = await new Download()

		// Download
		const returnVal = await download.downloadFile()

		expect(returnVal).toBe(0)

		done() // Finish the test
	})
})
