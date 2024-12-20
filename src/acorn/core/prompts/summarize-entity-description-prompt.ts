import { PromptTemplate } from "../prompt/prompt";

export const summarizeEntityDescriptionPrompt = new PromptTemplate({
  templateVars: ["entity_name", "description_list"],
  template: `您是一个乐于助人的助手，负责生成下方提供数据的综合摘要。

给定一个或两个实体，以及一个与同一实体或实体组相关联的描述列表。

请将所有这些信息串联成一个单一的、全面的描述。请确保包含从所有描述中收集的信息。

如果提供的描述之间存在矛盾，请解决这些矛盾并提供一个单一、连贯的摘要。

请确保以第三人称书写，并包含实体名称，以便我们拥有完整的上下文。

#######
-Data-
Entities: {entity_name}
Description List: {description_list}
#######
Output:
`,
});
