'use strict'

const fs = require('fs')
const puppeteer = require('puppeteer')
const { configureToMatchImageSnapshot } = require('jest-image-snapshot')
const PuppeteerHar = require('puppeteer-har')

const width = 800
const height = 600
const delayMS = 5

const username = 'accTest'
const password = 'accPass'

let browser
let page
let har

// Difference in pixels allowed before snapshots are considered not to match
const toMatchImageSnapshot = configureToMatchImageSnapshot({
	customDiffConfig: { threshold: 2 },
	noColors: true,
})
expect.extend({ toMatchImageSnapshot })

describe('Log In and Register', () => {
	beforeEach(async() => {
		browser = await puppeteer.launch({ headless: true, slowMo: delayMS, args: [`--window-size=${width},${height}`] })
		page = await browser.newPage()
		har = new PuppeteerHar(page)
		await page.setViewport({ width, height })
	})

	afterEach(() => browser.close()) // https://github.com/GoogleChrome/puppeteer/issues/561

	test('Register and Log In', async done => {
		// Begin generating a trace file
		await page.tracing.start({ path: 'trace/register_and_log_in_har.json', screenshots: true })
		await har.start({ path: 'trace/register_and_log_in_trace.har' })
		// ARRANGE
		await page.goto('http://localhost:8080', { timeout: 30000, waitUntil: 'load' })
		// take a screenshot and save to the file system
		await page.screenshot({ path: 'screenshots/require_login.png' })

		// ACT
		// Go to the registration page
		await page.click('form[name="registerBtn"] > input[type=submit]')
		await page.waitForSelector('h1')
		// Complete registration and submit form
		await page.type('input[name="user"]', username)
		await page.type('input[name="pass"]', password)
		await page.click('input[type=submit]')
		await page.waitForSelector('h1')

		// ASSERT
		// Check log in page has loaded
		let title = await page.title()
		expect(title).toBe('Log In')

		// ACT
		// Log in using newly registered details
		await page.type('input[name="user"]', username)
		await page.type('input[name="pass"]', password)
		await page.click('input[type=submit]')
		await page.waitForSelector('h1')

		// ASSERT
		// Check Home Page Loaded
		title = await page.title()
		expect(title).toBe('Home Page')

		// Take screenshot
		const image = await page.screenshot()
		// Compare to the screenshot from the previous run
		expect(image).toMatchImageSnapshot()
		// Stop logging to the trace files
		await page.tracing.stop()
		await har.stop()
		done()
	}, 16000)

	test('Log In - Existing Account', async done => {
		// Begin generating a trace file
		await page.tracing.start({ path: 'trace/log_in_har.json', screenshots: true })
		await har.start({ path: 'trace/log_in_trace.har' })
		// ARRANGE
		await page.goto('http://localhost:8080', { timeout: 30000, waitUntil: 'load' })
		// take a screenshot and save to the file system
		await page.screenshot({ path: 'screenshots/login.png' })

		// ACT
		// Complete login and submit form
		await page.type('input[name="user"]', username)
		await page.type('input[name="pass"]', password)
		await page.click('input[type=submit]')
		await page.waitForSelector('h1')

		// ASSERT
		// Check home page has loaded
		const title = await page.title()
		expect(title).toBe('Home Page')

		// Take screenshot
		const image = await page.screenshot()
		// Compare to the screenshot from the previous run
		expect(image).toMatchImageSnapshot()
		// Stop logging to the trace files
		await page.tracing.stop()
		await har.stop()
		done()
	}, 16000)

	test('Log Out', async done => {
		// Begin generating a trace file
		await page.tracing.start({ path: 'trace/log_out_har.json', screenshots: true })
		await har.start({ path: 'trace/log_out_trace.har' })
		// ARRANGE
		await page.goto('http://localhost:8080', { timeout: 30000, waitUntil: 'load' })
		// take a screenshot and save to the file system
		await page.screenshot({ path: 'screenshots/log-out.png' })

		// ACT
		// Log in using existing details
		await page.type('input[name="user"]', username)
		await page.type('input[name="pass"]', password)
		await page.click('input[type=submit]')
		await page.waitForSelector('h1')

		// ASSERT
		// Check Home Page Loaded
		let title = await page.title()
		expect(title).toBe('Home Page')

		// ACT
		// Attempt log out
		await page.click('form[name="logoutBtn"] > input[type=submit]')
		await page.waitForSelector('h1')

		// ASSERT
		// Check log in page has loaded
		title = await page.title()
		expect(title).toBe('Log In')

		// Take screenshot
		const image = await page.screenshot()
		// Compare to the screenshot from the previous run
		expect(image).toMatchImageSnapshot()
		// Stop logging to the trace files
		await page.tracing.stop()
		await har.stop()
		done()
	}, 16000)
})

describe('File Upload', () => {
	beforeEach(async() => {
		browser = await puppeteer.launch({ headless: true, slowMo: delayMS, args: [`--window-size=${width},${height}`] })
		page = await browser.newPage()
		har = new PuppeteerHar(page)
		await page.setViewport({ width, height })
	})

	afterEach(() => browser.close())

	test('Log In and Upload File', async done => {
		// Begin generating a trace file
		await page.tracing.start({ path: 'trace/log_in_and_upload_har.json', screenshots: true })
		await har.start({ path: 'trace/log_in_and_upload_trace.har' })
		// ARRANGE
		await page.goto('http://localhost:8080', { timeout: 30000, waitUntil: 'load' })
		// take a screenshot and save to the file system
		await page.screenshot({ path: 'screenshots/log_in_and_upload.png' })

		// ACT
		// Log In
		await page.type('input[name="user"]', username)
		await page.type('input[name="pass"]', password)
		await page.click('input[type=submit]')
		await page.waitForSelector('h1')
		// await page.waitFor(1000) // sometimes you need a second delay

		// ASSERT
		// Check home page has loaded
		let title = await page.title()
		expect(title).toBe('Home Page')

		// ACT
		await page.click('input[type=submit]')
		await page.waitForSelector('h1')

		// ASSERT
		// Check Upload Page Has Loaded
		title = await page.title()
		expect(title).toBe('Upload A File')

		// ACT
		// Upload a file
		await page.type('[name="targetuser"]', username)
		const filePath = './acceptance tests/testing.txt'
		const input = await page.$('input[type=file]')
		await input.uploadFile(filePath)
		await page.click('input[type=submit]')
		await page.waitForSelector('h1')

		// ASSERT
		// Check Upload Succeed and share page loaded
		title = await page.title()
		expect(title).toBe('Share Your File')

		// Take screenshot
		const image = await page.screenshot()
		// Compare to the screenshot from the previous run
		expect(image).toMatchImageSnapshot()
		// Stop logging to the trace files
		await page.tracing.stop()
		await har.stop()
		done()
	}, 16000)

	test('See File in File List', async done => {
		// Begin generating a trace file
		await page.tracing.start({ path: 'trace/see_file_in_list_har.json', screenshots: true })
		await har.start({ path: 'trace/see_file_in_list_trace.har' })
		// ARRANGE
		await page.goto('http://localhost:8080', { timeout: 30000, waitUntil: 'load' })
		// take a screenshot and save to the file system
		await page.screenshot({ path: 'screenshots/see_file_in_list.png' })

		// ACT
		// Log In
		await page.type('input[name="user"]', username)
		await page.type('input[name="pass"]', password)
		await page.click('input[type=submit]')
		await page.waitForSelector('h1')
		// await page.waitFor(1000) // sometimes you need a second delay

		// ASSERT
		// Check home page has loaded
		let title = await page.title()
		expect(title).toBe('Home Page')

		// ACT
		// Go to file list
		await page.click('form[name="fileListBtn"] > input[type=submit]')
		await page.waitForSelector('h1')

		// ASSERT
		// Check File List Has Loaded
		title = await page.title()
		expect(title).toBe('Available Files')
		// Check file is in the list
		expect(await page.evaluate(() => document.querySelector('p').innerText)).toBe('testing.txt')

		// Take screenshot
		const image = await page.screenshot()
		// Compare to the screenshot from the previous run
		expect(image).toMatchImageSnapshot()
		// Stop logging to the trace files
		await page.tracing.stop()
		await har.stop()
		done()
	}, 16000)
})

describe('File Download', () => {
	beforeEach(async() => {
		browser = await puppeteer.launch({ headless: true, slowMo: delayMS, args: [`--window-size=${width},${height}`] })
		page = await browser.newPage()
		har = new PuppeteerHar(page)
		await page.setViewport({ width, height })
	})

	afterEach(() => browser.close())

	test('Log In and Download File', async done => {
		// Begin generating a trace file
		await page.tracing.start({ path: 'trace/log_in_and_download_har.json', screenshots: true })
		await har.start({ path: 'trace/log_in_and_download_trace.har' })
		// ARRANGE
		await page.goto('http://localhost:8080', { timeout: 30000, waitUntil: 'load' })
		// take a screenshot and save to the file system
		await page.screenshot({ path: 'screenshots/log_in_and_download.png' })

		// ACT
		// Log In
		await page.type('input[name="user"]', username)
		await page.type('input[name="pass"]', password)
		await page.click('input[type=submit]')
		await page.waitForSelector('h1')
		// await page.waitFor(1000) // sometimes you need a second delay

		// ASSERT
		// Check home page has loaded
		let title = await page.title()
		expect(title).toBe('Home Page')

		// ACT
		// Go to file list
		await page.click('form[name="fileListBtn"] > input[type=submit]')
		await page.waitForSelector('h1')

		// ASSERT
		// Check File List Has Loaded
		title = await page.title()
		expect(title).toBe('Available Files')
		// Check file is in the list
		expect(await page.evaluate(() => document.querySelector('p').innerText)).toBe('testing.txt')

		// ACT
		// Download the file
		await page._client.send('Page.setDownloadBehavior', {
			behavior: 'allow',
			downloadPath: '__dirname/downloads/'
		})
		const downloadElements = await page.$x('//a[contains(., \'Download\')]')
		await downloadElements[0].click()

		// ASSERT
		// Check file was downloaded
		let existing = false
		await fs.stat('acceptance tests/downloads/testing.txt', (err) => {
			if (err) throw err
		})
		existing = true // If stat executes successfully existing will be true, else an error is thrown
		expect(existing).toBeTruthy()

		// Take screenshot
		const image = await page.screenshot()
		// Compare to the screenshot from the previous run
		expect(image).toMatchImageSnapshot()
		// Stop logging to the trace files
		await page.tracing.stop()
		await har.stop()
		done()
	}, 16000)
})
