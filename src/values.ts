export const labels = {
    paused: 0, // 暂停
    waiting: 0, // 等待
    waitprocess: 0, // 等待处理
    waitdep: 0, // 等待前置
    upnext: 0, // 在即
    processing: 0, // 正在处理
    waitmerge: 0, // 等待合并
    waitsync: 0, // 等待同步
    done: 0, // 完成

    ignored: 0, // 忽略
    rejected: 0, // 拒绝/放弃
    noplan: 0, // 暂无计划
    duplicate: 0, // 重复
    timeout: 0, // 超时关闭
    thirdparty: 0, // 第三方问题

    highquality: 0, // 高质量
    breaking: 0, // 破坏性
    upstream: 0, // 移交上游
    needinfo: 0, // 需要信息
    needreproduce: 0, // 需要复现
    needhelp: 0, // 需要帮助
}

export type Label = keyof typeof labels;
