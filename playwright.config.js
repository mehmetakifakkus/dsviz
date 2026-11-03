// Browser tests: npm test (see README, "Testler")
const { defineConfig, devices } = require('@playwright/test');

const PORT = 8765;

module.exports = defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
	webServer: {
		command: `node tests/server.js ${PORT}`,
		url: `http://localhost:${PORT}/index.html`,
		reuseExistingServer: !process.env.CI
	}
});
