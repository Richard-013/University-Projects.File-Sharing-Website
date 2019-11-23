'use strict'

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
	beforeEach(async () => {
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
		await page.goto('http://localhost:8080', { timeout: 30000, waitUntil: 'load' })
		// take a screenshot and save to the file system
		await page.screenshot({ path: 'screenshots/require_login.png' })

		// ACT
		// Go to the registration page
		await page.click('[name=goRegister]')
		// Complete registration and submit form
		await page.type('input[name=user]', username)
		await page.type('input[name=pass]', password)
		await page.click('input[type=submit]')
		await page.waitForSelector('h1')
		// await page.waitFor(1000) // sometimes you need a second delay

		// ASSERT
		// Check log in page has loaded
		let title = await page.title()
		expect(title).toBe('Log In')

		// ACT
		// Log in using newly registered details
		await page.type('input[name=user]', username)
		await page.type('input[name=pass]', password)
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
		await page.goto('http://localhost:8080', { timeout: 30000, waitUntil: 'load' })
		// take a screenshot and save to the file system
		await page.screenshot({ path: 'screenshots/login.png' })

		// ACT
		// Complete login and submit form
		await page.type('input[name=user]', username)
		await page.type('input[name=pass]', password)
		await page.click('input[type=submit]')
		await page.waitForSelector('h1')
		// await page.waitFor(1000) // sometimes you need a second delay

		// ASSERT
		// Check log in page has loaded
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
		await page.goto('http://localhost:8080', { timeout: 30000, waitUntil: 'load' })
		// take a screenshot and save to the file system
		await page.screenshot({ path: 'screenshots/log-out.png' })

		// ACT
		// Log in using existing details
		await page.type('input[name=user]', username)
		await page.type('input[name=pass]', password)
		await page.click('input[type=submit]')
		await page.waitForSelector('h1')

		// ASSERT
		// Check Home Page Loaded
		let title = await page.title()
		expect(title).toBe('Home Page')

		// Attempt log out
		await page.click('[name=logout]')
		await page.waitForSelector('h1')
		// await page.waitFor(1000) // sometimes you need a second delay

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

