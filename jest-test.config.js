'use strict'

module.exports = {
	displayName: 'test',
	verbose: true,
	collectCoverage: true,
	coverageThreshold: {
		global: {
			branches: 0,
			functions: 0,
			lines: 0,
			statements: 0
		}
	},
	testPathIgnorePatterns: [
		'/node_modules/',
		'/__tests__/fixtures/',
	]
}
