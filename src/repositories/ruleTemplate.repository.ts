import { BaseRepository } from "./base.repository";
import { RuleTemplate } from "../types";

export class RuleTemplateRepository extends BaseRepository<RuleTemplate> {
  constructor() {
    super("v3_rule_templates");
  }
}

export const ruleTemplateRepository = new RuleTemplateRepository();
