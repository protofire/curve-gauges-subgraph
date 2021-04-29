import { Bytes, log } from '@graphprotocol/graph-ts'
import { integer } from '@protofire/subgraph-toolkit'

import {
  Deposit,
  UpdateLiquidityLimit,
  Withdraw,
} from '../generated/templates/LiquidityGauge/LiquidityGauge'

import { ApplyOwnership, NewGauge } from '../generated/GaugeController/GaugeController'

import { LiquidityGauge } from '../generated/templates'

import * as schema from '../generated/schema'

export function handleTransferOwnership(event: ApplyOwnership): void {
  log.warning('Transferred ownership, contract: GaugeController, new_admin: {}', [
    event.params.admin.toHexString(),
  ])
}

export function handleNewGauge(event: NewGauge): void {
  let isNewContract = getOrRegisterContract(event.params.addr)

  if (isNewContract) {
    if (event.params.gauge_type == integer.ZERO) {
      LiquidityGauge.create(event.params.addr)

      log.warning('New gauge registered, contract: LiquidityGauge, address: {}', [
        event.params.addr.toHexString(),
      ])
    }
  }
}

export function handleUpdateLiquidityLimit(event: UpdateLiquidityLimit): void {
  getOrRegisterContract(event.address)

  let gauge = new schema.Gauge(event.params.user.toHex() + '-' + event.address.toHex())
  gauge.user = event.params.user
  gauge.gauge = event.address
  gauge.originalBalance = event.params.original_balance
  gauge.originalSupply = event.params.original_supply
  gauge.workingBalance = event.params.working_balance
  gauge.workingSupply = event.params.working_supply

  gauge.timestamp = event.block.timestamp
  gauge.block = event.block.number
  gauge.transaction = event.transaction.hash

  gauge.save()
}

export function handleDeposit(event: Deposit): void {
  getOrRegisterContract(event.address)

  let deposit = new schema.Deposit(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  deposit.provider = event.params.provider
  deposit.value = event.params.value
  deposit.save()
}

export function handleWithdraw(event: Withdraw): void {
  getOrRegisterContract(event.address)

  let withdraw = new schema.Withdraw(
    event.transaction.hash.toHex() + '-' + event.logIndex.toString(),
  )
  withdraw.provider = event.params.provider
  withdraw.value = event.params.value
  withdraw.save()
}

// Returns true if new contract is registered
function getOrRegisterContract(address: Bytes): boolean {
  let contract = schema.Contract.load(address.toHexString())

  if (contract == null) {
    contract = new schema.Contract(address.toHexString())
    contract.address = address
    contract.save()

    let gaugeCount = getCount('totalGauges')
    gaugeCount.value = integer.increment(gaugeCount.value)
    gaugeCount.save()

    return true
  }

  return false
}

// Returns particular count entity
function getCount(name: string): schema.Count {
  let count = schema.Count.load(name)

  if (count == null) {
    count = new schema.Count(name)
    count.value = integer.ZERO
  }

  return count as schema.Count
}
