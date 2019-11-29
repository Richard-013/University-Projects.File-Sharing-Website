#!/usr/bin/env node

// Routes File
'use strict'

// Module Imports
const fs = require('fs')
const Koa = require('koa')
const Router = require('koa-router')
const views = require('koa-views')
const staticDir = require('koa-static')
const bodyParser = require('koa-bodyparser')
const koaBody = require('koa-body')({multipart: true, uploadDir: '.'})
const session = require('koa-session')

// Custom Modules
const User = require('./modules/user')
const Upload = require('./modules/upload')
const Download = require('./modules/download')
const Remove = require('./modules/remove')

const app = new Koa()
const router = new Router()

// Middleware Config
app.keys = ['darkSecret']
app.use(staticDir('public'))
app.use(bodyParser())
app.use(session(app))
app.use(views(`${__dirname}/views`, { extension: 'handlebars' }, {map: { handlebars: 'handlebars' }}))

const defaultPort = 8080
const port = process.env.PORT || defaultPort
const dbName = 'website.db'
const domainName = 'http://localhost:8080'
const expiryCheckInterval = 200000 // Two Minutes

/**
 * The secure home page.
 *
 * @name Home Page
 * @route {GET} /
 * @authentication This route requires cookie-based authentication.
 * @queryparam {string} msg - optional message to display on the page.
 */
router.get('/', async ctx => {
	try {
		const expiryRemover = await new Remove(dbName) // Removes old files every five minutes whilst active
		setInterval(() => expiryRemover.removeExpiredFiles(), expiryCheckInterval)
		if(ctx.session.authorised !== true) return ctx.redirect('/login?msg=you need to log in')
		const data = {}
		if(ctx.query.msg) data.msg = ctx.query.msg
		await ctx.render('index')
	} catch(err) {
		await ctx.render('error', {message: err.message})
	}
})

/**
 * The user registration page.
 *
 * @name Register Page
 * @route {GET} /register
 */
router.get('/register', async ctx => await ctx.render('register'))

/**
 * The script to process new user registrations.
 *
 * @name Register Script
 * @route {POST} /register
 */
router.post('/register', koaBody, async ctx => {
	try {
		const body = ctx.request.body // Extracts data from page
		const {path, name} = ctx.request.files.avatar
		const user = await new User(dbName)
		await user.register(body.user, body.pass) // Registers the user
		await user.uploadAvatar(path, name, body.user) // Uploads their avatar
		ctx.redirect('/login?msg=new user added, please log in') // Redirects user to the login page
	} catch(err) {
		await ctx.render('error', {message: err.message})
	}
})

/**
 * The login page that all users can see.
 *
 * @name Login Page
 * @route {GET} /login
 * @queryparam {string} msg - optional message to display on the page.
 * @queryparam {string} user - optional to include username.
 */
router.get('/login', async ctx => {
	const data = {}
	if(ctx.query.msg) data.msg = ctx.query.msg
	if(ctx.query.user) data.user = ctx.query.user
	await ctx.render('login', data)
})

/**
 * The script to handle users logging in.
 *
 * @name Login Script
 * @route {POST} /login
 */
router.post('/login', async ctx => {
	try {
		const body = ctx.request.body
		const user = await new User(dbName)
		await user.login(body.user, body.pass)
		ctx.session.authorised = true
		ctx.session.username = body.user // Stores username in cookie for reference
		return ctx.redirect('/?msg=you are now logged in...')
	} catch(err) {
		await ctx.render('login', {msg: err.message})
	}
})

/**
 * A secure page where a user can upload a file.
 *
 * @name Upload Page
 * @route {GET} /upload
 * @authentication This route requires cookie-based authentication.
 * @queryparam {string} message - optional message to display on the page.
 */
router.get('/upload', async ctx => {
	try {
		if (ctx.session.authorised !== true) return ctx.redirect('/login?msg=you need to log in')
		const data = {}
		if (ctx.query.message) data.message = ctx.query.message
		await ctx.render('upload', data)
	} catch (err) {
		await ctx.render('error', { message: err.message })
	}
})

/**
 * The script that handles uploading a user's file to the server.
 *
 * @name Upload Script
 * @route {POST} /upload
 * @authentication This route requires cookie-based authentication.
 */
router.post('/upload', koaBody, async ctx => {
	try {
		if (ctx.session.authorised !== true) return ctx.redirect('/login?msg=you need to log in')
		const { path, name } = ctx.request.files.filetoupload // Gets details from file
		const targetUser = ctx.request.body.targetuser // Gets target user (user to share file with)
		const upload = await new Upload(dbName)
		// Attempts to upload file to the server, returns a status code to work with
		const uploadResult = await upload.uploadFile(path, name, ctx.session.username, targetUser) // Throws error if not successful
		ctx.redirect(`/shareFile?h=${uploadResult}`) // Successful upload
	} catch (err) {
		await ctx.redirect(`/upload?message=${err.message}`)
	}
})

/**
 * A secure page where a user can get the information they need to share their file.
 *
 * @name File Sharing Page
 * @route {GET} /shareFile
 * @authentication This route requires cookie-based authentication.
 * @queryparam {string} message - optional message to display on the page.
 * @queryparam {string} h - hash of the file that was uploaded.
 */
router.get('/shareFile', async ctx => {
	try {
		const shareLink = `${domainName}/file?h=${ctx.query.h}&u=${ctx.session.username}`
		await ctx.render('share', { link: shareLink })
	} catch (err) {
		await ctx.render('error', { message: err.message })
	}
})

/**
 * A secure page where a user can view information about the files available to them and download them.
 *
 * @name File List Page
 * @route {GET} /fileList
 * @authentication This route requires cookie-based authentication.
 * @queryparam {string} message - optional message to display on the page.
 */
router.get('/fileList', async ctx => {
	try {
		if (ctx.session.authorised !== true) return ctx.redirect('/login?msg=you need to log in')
		const download = await new Download(dbName)
		const allFiles = await download.generateFileList(ctx.session.username)
		const data = { files: allFiles }
		if (ctx.query.message) data.message = ctx.query.message
		await ctx.render('fileList', data)
	} catch (err) {
		await ctx.render('error', { message: err.message })
	}
})

/**
 * A secure page where a user downloads their chosen file.
 *
 * @name File Download Page
 * @route {GET} /file
 * @authentication This route requires cookie-based authentication.
 * @queryparam {string} u - user who uploaded the file.
 * @queryparam {string} h - hash id of the file.
 */
router.get('/file', async ctx => {
	try {
		if (ctx.session.authorised !== true) return ctx.redirect('/login?msg=you need to log in')
		const download = await new Download(dbName)
		const [sourceUser, hash] = [ctx.query.u, ctx.query.h]
		const filePath = await download.getFilePath(ctx.session.username, sourceUser, hash) // Throws if cannot access
		const fileName = await download.getFileName(sourceUser, hash)
		ctx.statusCode = 200
		ctx.body = fs.createReadStream(filePath)
		ctx.set('Content-disposition', `attachment; filename=${fileName}`) // Lets the user download the file
		const remover = await new Remove(this.dbName)
		const timer = 20000 // Sets timer amount (20 Seconds)
		setTimeout(() => {
			remover.removeFile(sourceUser, hash)
		}, timer) // Delete the file after approx. 20 seconds to allow user time to download it
		await ctx.render('download')
	} catch (err) {
		await ctx.render('error', { message: err.message })
	}
})

/**
 * User is logged out and redirected to the home page.
 *
 * @name Log Out Page
 * @route {GET} /logout
 */
router.get('/logout', async ctx => {
	ctx.session.authorised = null
	ctx.session.username = null
	ctx.redirect('/?msg=you are now logged out')
})

// Starts the server when the file is executed
app.use(router.routes())
module.exports = app.listen(port, async() => console.log(`listening on port ${port}`))
