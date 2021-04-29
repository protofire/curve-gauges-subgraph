const puppeteer = require('puppeteer')

const gauges = require('./data/gauges.json')

async function main() {
  const browser = await puppeteer.launch({ headless: false })

  try {
    const page = await browser.newPage()

    for (const gauge of gauges) {
      if (gauge?.address) {
        await page.goto(`https://etherscan.io/address/${gauge.address}`)
        await page.waitForSelector('#ContentPlaceHolder1_trContract')

        const transactionHash = await page.$eval(
          '#ContentPlaceHolder1_trContract [data-original-title="Creator Txn Hash"]',
          el => el.textContent,
        )

        await page.goto(`https://etherscan.io/tx/${transactionHash}`)
        await page.waitForSelector('#ContentPlaceHolder1_maintable')

        const startBlock = await page.$eval(
          '#ContentPlaceHolder1_maintable a[href^="/block/"]',
          el => el.textContent,
        )

        console.log(`
  - name: LiquidityGauge/${gauge.name}
    kind: ethereum/contract
    network: mainnet
    source:
      abi: LiquidityGauge
      address: '${address}'
      startBlock: ${startBlock}
    mapping: *liquidity_gauge_mapping`)
      }
    }
  } catch (err) {
    console.error(err)
  }

  await browser.close()
}

main()
