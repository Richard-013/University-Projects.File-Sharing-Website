'use strict'

const Upload = require('../modules/upload.js')

describe('uploadFile()', () => {
	test('verify that a file is received from user', async done => {
		expect.assertions(1)
		const upload = await new Upload()
		const file = upload.uploadFile()
		expect(file.length).toBe(1)
		done()
	})
})
