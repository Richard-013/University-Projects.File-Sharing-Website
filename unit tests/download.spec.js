'use strict'

const fs = require('fs')
const mock = require('mock-fs')
const sqlite = require('sqlite-async')
const Download = require('../modules/download.js')

describe('getFilePath()', () => {

	test('gets the file path to the requested resource', async done => {
		expect.assertions(1)
		const download = await new Download()
		// Upload files to test with
		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload) VALUES(?, ?, ?, ?)'
		await download.db.run(sql, 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'test.txt', 'txt', 'tester')
		// Get path to the file
		const returnVal = await download.getFilePath('tester', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')

		expect(returnVal).toBe('files/uploads/tester/a94a8fe5ccb19ba61c4c0873d391e987982fbbd3.txt')

		done() // Finish the test
	})

	test('throws correct error when there is no username', async done => {
		expect.assertions(1)
		const download = await new Download()

		await expect(download.getFilePath(undefined, 'a94a8fe5')).rejects
			.toEqual(Error('No username given, file cannot be located'))

		done()
	})

	test('throws correct error when there is no hash name', async done => {
		expect.assertions(1)
		const download = await new Download()

		await expect(download.getFilePath('tester', undefined)).rejects
			.toEqual(Error('No file name given, file cannot be located'))

		done()
	})

	test('throws correct error when the file does not exist', async done => {
		expect.assertions(1)
		const download = await new Download()

		await expect(download.getFilePath('tester', '5p00p5')).rejects
			.toEqual(Error('Requested file could not be found'))

		done()
	})
})

describe('getAllFiles()', () => {

	test('retrieves list of files successfully', async done => {
		expect.assertions(6)
		const download = await new Download()

		// Upload files to test with
		const sql = 'INSERT INTO files (hash_id, file_name, extension, user_upload) VALUES(?, ?, ?, ?)'
		await download.db.run(sql, 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'test.txt', 'txt', 'tester')
		await download.db.run(sql, 'B28B7AF69320201D1CF206EBF28373980ADD1451', 'main.cpp', 'cpp', 'tester')
		await download.db.run(sql, '6D0D5876E6710EBB4F309B5AF01090CB97381D06', 'print.py', 'py', 'omega')

		const allFiles = await download.getAllFiles()
		// Test type returned
		expect(Array.isArray(allFiles)).toBeTruthy()
		// Test length of array returned
		expect(allFiles.length).toBe(3)
		// Test first item of array - Test each element hash_id, file_name, user_upload, extension (in order)
		const file1 = allFiles[0]
		expect(file1[0]).toBe('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')
		expect(file1[1]).toBe('test.txt')
		expect(file1[2]).toBe('tester')
		expect(file1[3]).toBe('txt')

		done()
	})

	/*test('throws error successfully if there is a database issue', async done => {
		expect.assertions(1)
		const download = await new Download()
		await expect(download.getAllFiles()).rejects
			.toEqual(Error('Requested file could not be found'))
		done()
	})*/
})
