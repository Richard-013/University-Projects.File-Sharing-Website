'use strict'

const Accounts = require('../modules/user.js')
const fs = require('fs')
const mock = require('mock-fs')

describe('register()', () => {

	test('register a valid account', async done => {
		expect.assertions(1)
		// ARRANGE
		const account = await new Accounts()
		// ACT
		const register = await account.register('doej', 'password')
		// ASSERT
		expect(register).toBe(true)
		done()
	})

	test('register a duplicate username', async done => {
		expect.assertions(1)
		// ARRANGE
		const account = await new Accounts()
		await account.register('doej', 'password')

		// ACT AND ASSERT
		await expect( account.register('doej', 'password') )
			.rejects.toEqual( Error('username "doej" already in use') )
		done()
	})

	test('error if blank username', async done => {
		expect.assertions(1)
		// ARRANGE
		const account = await new Accounts()
		// ACT AND ASSERT
		await expect( account.register('', 'password') )
			.rejects.toEqual( Error('missing username') )
		done()
	})

	test('error if blank password', async done => {
		expect.assertions(1)
		// ARRANGE
		const account = await new Accounts()
		// ACT AND ASSERT
		await expect( account.register('doej', '') )
			.rejects.toEqual( Error('missing password') )
		done()
	})

})

describe('uploadAvatar()', () => {
	beforeEach(() => {
		mock({
			'public': {
				'avatars': {}
			},
			'example': {
				'image.png': Buffer.from([8, 6, 7, 5, 3, 0, 9]),
				'notImage.txt': 'This is not an image'
			}
		})
	})

	afterEach(mock.restore)

	test('allows user to upload an avatar', async done => {
		expect.assertions(1)
		// ARRANGE
		const account = await new Accounts()

		// ACT
		// Upload avatar
		await account.uploadAvatar('example/image.png', 'image.png', 'tester')

		// ASSERT
		// Check upload worked
		let existing = false
		await fs.stat('public/avatars/tester.png', (err) => {
			if (err) throw err
		})
		existing = true
		expect(existing).toBeTruthy()
		done()
	})

	test('handles no path correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const account = await new Accounts()

		// ACT
		// Upload no avatar
		const returnVal = await account.uploadAvatar(undefined, 'image.png', 'tester')

		// ASSERT
		expect(returnVal).toBe(0)
		done()
	})

	test('handles no file name correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const account = await new Accounts()

		// ACT
		const returnVal = await account.uploadAvatar('example/image.png', undefined, 'tester')

		// ASSERT
		expect(returnVal).toBe(0)
		done()
	})

	test('handles no file name and no path correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const account = await new Accounts()

		// ACT
		const returnVal = await account.uploadAvatar(undefined, undefined, 'tester')

		// ASSERT
		expect(returnVal).toBe(0)
		done()
	})

	test('handles no username correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const account = await new Accounts()

		// ACT AND ASSERT
		// Upload with no username
		await expect(account.uploadAvatar('example/image.png', 'image.png'))
			.rejects.toEqual(Error('No Username'))

		done()
	})

	test('handles 0 length username correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const account = await new Accounts()

		// ACT AND ASSERT
		await expect(account.uploadAvatar('example/image.png', 'image.png', ''))
			.rejects.toEqual(Error('No Username'))

		done()
	})

	test('rejects non-image avatars correctly', async done => {
		expect.assertions(1)
		// ARRANGE
		const account = await new Accounts()

		// ACT AND ASSERT
		// Upload text avatar
		await expect(account.uploadAvatar('example/notImage.txt', 'notImage.txt', 'BadUser'))
			.rejects.toEqual(Error('Avatar file must be an image'))
		done()
	})
})

describe('login()', () => {
	test('log in with valid credentials', async done => {
		expect.assertions(1)
		// ARRANEG
		const account = await new Accounts()

		await account.register('doej', 'password')
		// ACT
		const valid = await account.login('doej', 'password')
		// ASSERT
		expect(valid).toBe(true)
		done()
	})

	test('invalid username', async done => {
		expect.assertions(1)
		// ARRANGE
		const account = await new Accounts()

		await account.register('doej', 'password')

		// ACT AND ASSERT
		await expect( account.login('roej', 'password') )
			.rejects.toEqual( Error('username "roej" not found') )
		done()
	})

	test('invalid password', async done => {
		expect.assertions(1)
		// ARRANGE
		const account = await new Accounts()

		await account.register('doej', 'password')

		// ACT AND ASSERT
		await expect( account.login('doej', 'bad') )
			.rejects.toEqual( Error('invalid password for account "doej"') )
		done()
	})

})
