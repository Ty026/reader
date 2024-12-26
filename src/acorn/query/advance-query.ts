import { defaultQAPrompt } from "../core/prompts/default-qa-prompt";
import { ragPrompt } from "../core/prompts/rag-prompt";
import { tokenizers } from "../core/tokenizer/tokenizer";
import { getCompletion } from "../setting/get-completion";
import {
  getChunkDB,
  getEntityVectorDB,
  getGraphDB,
  getRelationshipVectorDB,
} from "../setting/get-db";
import { getEmbedding } from "../setting/get-embedding";
import { getLogger } from "../setting/logger";
import { buildGlobalQueryContext } from "./build-global-query-context";
import { buildLocalQueryContext } from "./build-local-query-context";
import { combineContext } from "./combine-context";
import { extractKeywordsFromQuery } from "./extract-keywords-from-query";

const overview = `## 简介
本书以咨询师的视角，深入剖析了江苏白酒企业“今世缘”如何从小到大，成功跨越“百亿营收”的发展历程。书中借鉴了管理大师德鲁克的思想，并结合今世缘的实践，探讨了企业在不同阶段的成长之道。

**本书的主要内容可以归纳为以下六个方面, 作者称为六维进化密码**

1.  **文化塑造的持续进化：**
    - 追溯高沟酒厂2200多年的历史，阐述“缘”文化是今世缘的独特基因，是其品牌发展的核心密码。
    - 深入分析了今世缘如何利用“缘”文化，增强员工的归属感，以及在品牌建设、产品销售中的作用。
    - 强调今世缘的文化核心要义，并以此为基础赋能发展，成为重要的“缘动力”。
    - 解读了今世缘如何通过“情缘”切入,自婚宴市场爆发，并不断拓展“缘”文化的应用场景。
2.  **品质主义的不懈坚守：**
    - 强调品质是企业生存的根本，今世缘始终将品质视为“集体信仰”。
    - 讲述了今世缘从细节入手，如何保证产品质量，例如停产保障酒质稳定性。
    - 列举了今世缘获得的全国级品质桂冠，如国缘系列获得中国绿色食品认证等。
    - 以今世缘副董事长吴建峰博士的故事为例，展现今世缘人对品质的执着。
3.  **模式创新的不断突破：**
    - 强调创新是企业发展的根本动力，借鉴了德鲁克的思想，指出企业应具备营销和创新双重职能。
    - 分析了今世缘在行业内率先创造的多种模式，例如直销模式、智能酿造和中度酒度兼顾高度口感等，以此推动企业发展。
    - 强调了今世缘的不断迭代,才能从“县酒”“市酒”跃升到“省酒”,甚至未来参与全球竞争。
4.  **战略布局的升维重构：**
    - 分析了今世缘在战略布局上的重大决策，例如确定“十五五”双百亿战略目标，深化国缘品牌的品牌印象。
    - 提出了“聚焦国缘品牌，未来潜力和可能性最大”的战略选择。
    - 阐述了今世缘如何通过聚焦战略力量，实现从2016年营收25亿到2023年突破100亿的跨越式发展。
5.  **数智科技的赋能运用：**
    - 强调了数字经济时代数智化转型对白酒行业的重要性，指出其是部署新质生产力的关键路径。
    - 分析了今世缘在数字化转型方面的实践，例如智能酿造、移动营销系统、深度会员管理系统等。
    - 强调了以质取胜、扩大智能制造规模、推动传统酿酒产业转型升级的重要性。
6.  **组织变革的深化升级：**
    - 借鉴了约翰·科特教授的观点，强调了变革型领导在企业发展中的作用。
    - 讲述了今世缘如何通过组织变革，充分授权裂变事业部、重构中高管、核心经销商等，增强人才密度。
    - 指出了今世缘的第三次变革正在从图纸变为基础坚实的建筑集群，正在迈入新的发展阶段。
    - 解读了顾祥悦提出的“六个相信”：相信“相信”的力量。

**核心观点和细节：**

- **强调“缘”文化：**“缘”文化是今世缘的品牌核心，是其与其他白酒品牌差异化的关键。书中详细解读了“缘”文化的内涵和外延，以及如何在企业发展中应用和体现。
- **注重品质：**今世缘始终坚持品质至上的原则，视质量为企业的生命线，不断投入巨资，致力于技术革新和产品升级。
- **敢于创新：**今世缘不惧怕挑战，勇于尝试新的经营模式和营销手段，并敢于打破固有模式，不断提升市场竞争力。
- **战略布局：** 今世缘的战略布局具有前瞻性和系统性，能够根据市场变化和自身优势进行调整，最终实现跨越式发展。
- **数智赋能：**今世缘积极拥抱数字化转型，利用现代科技提升生产效率和管理水平。
- **组织变革：**今世缘通过持续变革，打造充满活力和创新精神的组织，为企业的可持续发展提供了坚实的基础。
- **以消费者为中心：** 今世缘始终将消费者视为中心，洞察消费者需求，不断优化产品和服务，努力满足消费者对美好生活的向往。
- **与时代同频共振：**今世缘始终以开放的心态拥抱变化，紧随时代发展趋势，不断调整自身的发展战略，确保企业持续健康发展。
- **既要“修内功”也要“抓外联”：**今世缘既注重内部能力的提升，也积极与外部各方建立合作关系，实现了内外兼修，协同发展。
- **知行合一：**今世缘将管理思想应用于实际经营中，将“知”转化为“行”，并用“行”来检验“知”，最终以“成就”来衡量价值。

《百亿酒业进化论》不仅是一部企业发展史，更是一部关于企业管理、品牌建设和营销策略的实践指南。它详细阐述了今世缘的成长之路，同时结合了企业发展的普遍规律和管理学理论，深入剖析了企业在不同阶段面临的挑战与机遇，以及如何应对。本书不仅适合白酒行业的从业者阅读,对于其他行业的管理者、创业者和学生,也具有重要的参考价值和启发意义。`;

export async function advanceQuery(
  query: string,
  type: "local" | "global" | "hybrid" = "local",
) {
  await tokenizers.init();

  const allKeywords = await extractKeywordsFromQuery(query);
  if (
    !allKeywords ||
    allKeywords.high_level_keywords.length === 0 ||
    allKeywords.low_level_keywords.length === 0
  ) {
    const chatCompletion = getCompletion("text");
    const result = await chatCompletion.chat({
      messages: [
        { role: "system", content: defaultQAPrompt },
        { role: "user", content: query },
      ],
      stream: true,
    });
    return result;
  }

  let keywords = allKeywords.low_level_keywords;
  if (type === "global") keywords = allKeywords.high_level_keywords;

  let ctx: string | null = null;
  if (type === "local") {
    ctx = await buildLocalQueryContext(
      getEmbedding(),
      keywords.join(", "),
      getGraphDB(),
      getEntityVectorDB(),
      getChunkDB(),
      false,
    );
  } else if (type === "global") {
    ctx = await buildGlobalQueryContext(
      getEmbedding(),
      keywords.join(", "),
      getGraphDB(),
      getEntityVectorDB(),
      getRelationshipVectorDB(),
      getChunkDB(),
      false,
    );
  } else if (type === "hybrid") {
    const lowLevelCtx = await buildLocalQueryContext(
      getEmbedding(),
      allKeywords.low_level_keywords.join(", "),
      getGraphDB(),
      getEntityVectorDB(),
      getChunkDB(),
      true,
    );
    const highLevelCtx = await buildGlobalQueryContext(
      getEmbedding(),
      allKeywords.high_level_keywords.join(", "),
      getGraphDB(),
      getEntityVectorDB(),
      getRelationshipVectorDB(),
      getChunkDB(),
      true,
    );

    const combined = combineContext(lowLevelCtx, highLevelCtx);
    ctx = combined;
  }

  let systemPrompt = "";
  if (!ctx) {
    getLogger().error("No result");
    systemPrompt = `你只需要回答**对不起，我无法回答这个问题**`;
  } else {
    systemPrompt = ragPrompt.format({
      context: ctx,
      response_type: "简短段落",
      extra_data: overview,
    });
  }

  const chatCompletion = getCompletion("text");
  const result = await chatCompletion.chat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    stream: true,
  });

  return result;
}
