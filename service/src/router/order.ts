import express from 'express'
import { orders, users } from '../model'
import { Role } from '../model/helper'
import alipaySdk, { countTimes, createAmount, createOrderId } from '../utils/payment'

const router = express.Router()

router.post('/alipay/notify', async (req, res) => {
  console.log(req)

  console.log('notify params', req.params)
  console.log('notify body', req.body)

  if (req.body.trade_status === 'TRADE_SUCCESS') {
    console.log('async notify')
    console.log(req.body)
  }

  res.send('success')
})

router.post('/alipay/pay', async (req, res) => {
  const currentTime = Date.now() / 1000 // Convert to seconds

  const result = await alipaySdk.pageExec('alipay.trade.page.pay', {
    notify_url: 'http://ciyfs4.natappfree.cc/alipay/notify', // 通知回调地址
    bizContent: {
      out_trade_no: `chatmindorder${currentTime}`,
      total_amount: '0.01',
      subject: '测试订单',
      product_code: 'FAST_INSTANT_TRADE_PAY',
    },
    method: 'GET',
  })

  res.setHeader('Content-type', 'text/html')
  res.send(result)

  console.log(result)
})

router.post('/pay', async (req, res) => {
  // 订单号
  const id = createOrderId()

  // 订单金额
  const amount = 0.01

  // 获取未支付订单列表
  const orderIt = orders.iterator()

  // 遍历订单
  const orderNoExpire: any[] = []

  for await (const [key, value] of orderIt) {
    const {
      createdAt,
      amount,
      actualAmount,
    } = value
    // 获取2分钟未支付的订单
    if (countTimes(Date.parse(createdAt), Date.now()) <= 2) {
      // 如果存在
      orderNoExpire.push(actualAmount)
    }
  }

  console.log('current pending orders', orderNoExpire)

  // 判断是否有2分钟未支付的订单
  let needPay = 0
  if (orderNoExpire.length === 0) {
    needPay = amount
  }
  else {
    // 获取2分钟未支付的订单的最小金额-0.01
    const needPayMin = createAmount(Math.min(...orderNoExpire), -0.01)
    // 如果最小金额-0.01小于订单价格则获取2分钟未支付的订单的最大金额+0.01
    if (needPayMin <= amount) {
      needPay = createAmount(Math.max(...orderNoExpire), 0.01)
    }
    else {
    // 否则使用最小金额-0.01
      needPay = needPayMin
    }
  }

  // 先判断未支付订单量是否超过10个
  if (orderNoExpire.length >= 10) {
    // 超过10个订单未支付
    console.log('当前支付人数过多，请稍等再刷新页面！')
    res.status(501).send({
      status: 'Fail',
      message: '当前支付人数过多，请稍等再刷新页面！',
    })
  }
  else {
    // 创建订单
    const order = {
      createdAt: new Date(),
      type: 'subcription',
      amount,
      actualAmount: needPay,
      status: false,
    }
    await orders.create(id, order, 2 * 60_000)

    console.log(`创建订单成功！订单号：${id}，应付金额：${needPay}`, order)
    res.send({
      status: 'Success',
      message: 'Order created.',
      data: {
        id,
        ...order,
      },
    })
  }
})

router.post('/notify', async (req: any, res) => {
  const { id } = req.body

  const user = req.auth.user
  if (!isModerator((await users.read(user))?.role)) {
    res.status(404).send({
      status: 'Fail',
      message: `用户无权操作订单${id}`,
    })
    return
  }
  const order = await orders.read(id)
  if (!order) {
    console.log(`订单 ${id} 不存在`)
    res.status(404).send({
      status: 'Fail',
      message: `订单 ${id} 不存在`,
    })
    return
  }
  order.status = true
  await orders.update(id, order)
  console.log(`订单 ${id} 支付成功`)
  res.send({
    status: 'Success',
    message: `订单 ${id} 支付成功`,
  })
})

router.get('/order/:id', async (req, res) => {
  const { id } = req.params
  const order = await orders.read(id)
  if (!order) {
    console.log(`订单 ${id} 不存在`)
    res.status(404).send({
      status: 'Fail',
      message: `订单 ${id} 不存在`,
    })
    return
  }
  const { status, actualAmount } = order
  res.send({
    status: 'Success',
    data: {
      id,
      status,
      actualAmount,

    },
  })
})

export default router
function isModerator(role: string) {
  if (!role)
    return false

  if (role === Role.ADMIN || role === Role.MODERATOR)
    return true
  return false
}