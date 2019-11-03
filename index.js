#!/usr/bin/env node
/* eslint-disable complexity */

//Routes File

'use strict'

/* MODULE IMPORTS */
const bcrypt = require('bcrypt-promise')
const Koa = require('koa')
const Router = require('koa-router')
const views = require('koa-views')
const staticDir = require('koa-static')
const bodyParser = require('koa-bodyparser')
const koaBody = require('koa-body')({multipart: true, uploadDir: '.'})
const session = require('koa-session')
const sqlite = require('sqlite-async')
const fs = require('fs-extra')
const mime = require('mime-types')
//const jimp = require('jimp')

/* IMPORT CUSTOM MODULES */
const User = require('./modules/user')
const FileManagement = require('./modules/fileManagement.js')

const app = new Koa()
const router = new Router()

/* CONFIGURING THE MIDDLEWARE */
app.keys = ['darkSecret']
app.use(staticDir('public'))
app.use(bodyParser())
app.use(session(app))
app.use(views(`${__dirname}/views`, { extension: 'handlebars' }, {map: { handlebars: 'handlebars' }}))

const defaultPort = 8080
const port = process.env.PORT || defaultPort
const dbName = 'website.db'
const domainName = 'http://localhost:8080'
const saltRounds = 10

/**
 * The secure home page.
 *
 * @name Home Page
 * @route {GET} /
 * @authentication This route requires cookie-based authentication.
 */
router.get('/', async ctx => {
	try {
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
		// Extracts data from page
		const body = ctx.request.body
		const {path, type} = ctx.request.files.avatar
		// Calls required functions from user module
		const user = await new User(dbName)
		await user.register(body.user, body.pass)
		// await user.uploadPicture(path, type)
		// Redirects user to the login page
		ctx.redirect('/login?msg=new user added, please log in')
	} catch(err) {
		await ctx.render('error', {message: err.message})
	}
})

router.get('/login', async ctx => {
	const data = {}
	if(ctx.query.msg) data.msg = ctx.query.msg
	if(ctx.query.user) data.user = ctx.query.user
	await ctx.render('login', data)
})

router.post('/login', async ctx => {
	try {
		const body = ctx.request.body
		const user = await new User(dbName)
		await user.login(body.user, body.pass)
		ctx.session.authorised = true
		ctx.session.username = body.user // Stores username in cookie for reference
		return ctx.redirect('/?msg=you are now logged in...')
	} catch(err) {
		await ctx.render('error', {message: err.message})
	}
})

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

// eslint-disable-next-line max-lines-per-function
router.post('/upload', koaBody, async ctx => {
	try {
		// Prevents users who aren't logged in from uploading files
		if (ctx.session.authorised !== true) return ctx.redirect('/login?msg=you need to log in')
		const { path, name } = ctx.request.files.filetoupload // Gets details from file
		const uploadManager = await new FileManagement(dbName)
		// Attempts to upload file to the server, returns a status code to work with
		// REQUIRES REFACTORING TO REMOVE LOGIC FROM INDEX FILE
		const uploadStatus = await uploadManager.uploadFile(path, name, ctx.session.username)
		if (uploadStatus === 0) {
			const hash = await uploadManager.hashFileName(name)
			ctx.redirect(`/shareFile?h=${hash}`) // Successful upload
		} else if (uploadStatus === 1) {
			ctx.redirect('/upload?message=No file selected') // No file selected
		} else if (uploadStatus === -1) {
			ctx.redirect('/upload?message=Selected file does not exist') // File does not exist
		} else if (uploadStatus === -2) {
			ctx.redirect('/upload?message=User has already uploaded a file with the same name') // User has uploaded file with the same name
		} else if (uploadStatus === -3) {
			ctx.redirect('/upload?message=Database error has occurred, please try again') // Database error encountered
		} else {
			ctx.redirect('/upload?message=Something went wrong') // Generic error
		}
	} catch (err) {
		await ctx.render('error', { message: err.message })
	}
})

router.get('/shareFile', async ctx => {
	try {
		const shareLink = `${domainName}/file?h=${ctx.query.h}&u=${ctx.session.username}`
		const data = { link: shareLink }
		await ctx.render('share', data)
	} catch (err) {
		await ctx.render('error', { message: err.message })
	}
})

router.get('/fileList', async ctx => {
	try {
		if (ctx.session.authorised !== true) return ctx.redirect('/login?msg=you need to log in')
		const downloadManager = await new FileManagement(dbName)
		const allFiles = await downloadManager.getAllFiles()
		console.log(allFiles)
		const data = { files: allFiles }
		if (ctx.query.message) data.message = ctx.query.message
		await ctx.render('fileList', data)
	} catch (err) {
		await ctx.render('error', { message: err.message })
	}
})

router.get('/file', async ctx => {
	try {
		if (ctx.session.authorised !== true) return ctx.redirect('/login?msg=you need to log in')
		// Use query to pass in hash-id of the requested file and the username of who uploaded it
		// Use that information to get the file path and allow the user to download the file
		const downloadManager = await new FileManagement(dbName)
		// u is user and h is hash-id
		const filePath = await downloadManager.getFilePath(ctx.query.u, ctx.query.h)
		ctx.attachment(filePath)
		await ctx.render('download')
	} catch (err) {
		await ctx.render('error', { message: err.message })
	}
})

router.get('/logout', async ctx => {
	ctx.session.authorised = null
	ctx.redirect('/?msg=you are now logged out')
})

app.use(router.routes())
module.exports = app.listen(port, async() => console.log(`listening on port ${port}`))
