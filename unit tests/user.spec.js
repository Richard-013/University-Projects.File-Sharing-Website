'use strict'

const Accounts = require('../modules/user.js')
const fs = require('fs')
const mock = require('mock-fs')

describe('register()', () => {

	test('register a valid account', async done => {
		expect.assertions(1)
		const account = await new Accounts()

		const register = await account.register('doej', 'password')

		expect(register).toBe(true)
		done()
	})

	test('register a duplicate username', async done => {
		expect.assertions(1)
		const account = await new Accounts()
		await account.register('doej', 'password')

		await expect( account.register('doej', 'password') )
			.rejects.toEqual( Error('username "doej" already in use') )
		done()
	})

	test('error if blank username', async done => {
		expect.assertions(1)
		const account = await new Accounts()

		await expect( account.register('', 'password') )
			.rejects.toEqual( Error('missing username') )
		done()
	})

	test('error if blank password', async done => {
		expect.assertions(1)
		const account = await new Accounts()

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
				'image.png': Buffer.from([8, 6, 7, 5, 3, 0, 9])
			}
		})
	})

	afterEach(mock.restore)

	test('allows user to upload an avatar', async done => {
		expect.assertions(1)
		const account = await new Accounts()

		// Upload avatar
		await account.uploadAvatar('example/image.png', 'image.png', 'tester')

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
		const account = await new Accounts()

		// Upload no avatar
		const returnVal = await account.uploadAvatar(undefined, 'image.png', 'tester')

		expect(returnVal).toBe(0)
		done()
	})

	test('handles no file name correctly', async done => {
		expect.assertions(1)
		const account = await new Accounts()

		// Upload no avatar
		const returnVal = await account.uploadAvatar('example/image.png', undefined, 'tester')

		expect(returnVal).toBe(0)
		done()
	})

	test('handles no file name and no path correctly', async done => {
		expect.assertions(1)
		const account = await new Accounts()

		// Upload no avatar
		const returnVal = await account.uploadAvatar(undefined, undefined, 'tester')

		expect(returnVal).toBe(0)
		done()
	})

	test('handles no username correctly', async done => {
		expect.assertions(1)
		const account = await new Accounts()

		// Upload no avatar
		await expect(account.uploadAvatar('example/image.png', 'image.png'))
			.rejects.toEqual(Error('No Username'))

		done()
	})

	test('handles 0 length username correctly', async done => {
		expect.assertions(1)
		const account = await new Accounts()

		// Upload no avatar
		await expect(account.uploadAvatar('example/image.png', 'image.png', ''))
			.rejects.toEqual(Error('No Username'))

		done()
	})
})

describe('login()', () => {
	test('log in with valid credentials', async done => {
		expect.assertions(1)
		const account = await new Accounts()

		await account.register('doej', 'password')
		const valid = await account.login('doej', 'password')

		expect(valid).toBe(true)
		done()
	})

	test('invalid username', async done => {
		expect.assertions(1)
		const account = await new Accounts()

		await account.register('doej', 'password')

		await expect( account.login('roej', 'password') )
			.rejects.toEqual( Error('username "roej" not found') )
		done()
	})

	test('invalid password', async done => {
		expect.assertions(1)
		const account = await new Accounts()

		await account.register('doej', 'password')

		await expect( account.login('doej', 'bad') )
			.rejects.toEqual( Error('invalid password for account "doej"') )
		done()
	})

})
