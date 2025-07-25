import { Context } from "probot";

export const Labels = {
    /** 暂停 */ paused: 8558220235,
    /** 等待 */ waiting: 8743070786,
    /** 等待处理 */ waitprocess: 6820804546,
    /** 等待前置 */ waitdep: 8020457542,
    /** 在即 */ upnext: 8550609020,
    /** 正在处理 */ processing: 6820804544,
    /** 正在复核 */ reviewing: 8995103672,
    /** 等待合并 */ waitmerge: 7911992426,

    /** 完成 */ done: 6820804547,

    isProcessLabel: (number: number) =>
        number === Labels.paused ||
        number === Labels.waiting ||
        number === Labels.waitprocess ||
        number === Labels.waitdep ||
        number === Labels.upnext ||
        number === Labels.processing ||
        number === Labels.waitmerge,
    isDoneLabel: (number: number) =>
        number === Labels.done,
    isPositiveLabel: (number: number) =>
        Labels.isProcessLabel(number) ||
        Labels.isDoneLabel(number),

    /** 重复 */ duplicate: 6820804541,

    /** 忽略 */ ignored: 8064650117,
    /** 拒绝/放弃 */ rejected: 6820804539,
    /** 暂无计划 */ noplan: 8059776019,
    /** 超时关闭 */ timeout: 8455841717,
    /** 第三方 */ thirdparty: 8065680919,
    /** 移交上游 */ upstream: 8038525704,

    /** 信息补充 */ needinfo: 6820804549,
    /** 需要复现 */ needreproduce: 8142488319,
    /** 需要帮助 */ needhelp: 6820804551,

    isDuplicateLabel: (number: number) =>
        number === Labels.duplicate,
    isNotPlannedLabel: (number: number) =>
        number === Labels.ignored ||
        number === Labels.rejected ||
        number === Labels.noplan ||
        number === Labels.timeout ||
        number === Labels.thirdparty ||
        number === Labels.upstream,
    isNeedingLabel: (number: number) =>
        number === Labels.needinfo ||
        number === Labels.needreproduce ||
        number === Labels.needhelp,
    isNegativeLabel: (number: number) =>
        Labels.isNotPlannedLabel(number) ||
        Labels.isDuplicateLabel(number) ||
        Labels.isNeedingLabel(number),

    /** 高质量 */ highquality: 6820804543,
    /** 破坏性 */ breaking: 8020515630,
    /** 等待同步 */ waitsync: 8552646493,

    isMarkupLabel: (number: number) =>
        number === Labels.highquality ||
        number === Labels.breaking ||
        number === Labels.waitsync,
    isMarkupLabelOrSelf: (number: number, self: number) =>
        number === self ||
        Labels.isMarkupLabel(number),

    size_xs: 8996225707,
    size_s: 8996226542,
    size_m: 8996229667,
    size_l: 8996232860,
    size_xl: 8996233917,
    size_xxl: 8996234474,
}

declare module "probot" {
    interface Context {
        label: (...ids: number[]) => Promise<string[]>;
    }
}

Context.prototype.label = async function(...ids: number[]): Promise<string[]> {
    const context = this;
    const repoLabels = await context.octokit.issues.listLabelsForRepo(context.repo());
    const names = [];
    for (const label of repoLabels.data) {
        if (ids.includes(label.id)) {
            names.push(label.name);
            if (names.length === ids.length) break;
        }
    }
    return names;
};
