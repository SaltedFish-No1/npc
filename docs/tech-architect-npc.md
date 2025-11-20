# Technical Architecture Consultant NPC

## Overview

The Technical Architecture Consultant is a specialized NPC character designed to evaluate technical projects from a purely engineering perspective. This character focuses on architecture rationality, maintainability, risks, scalability, cost control, and long-term evolution paths.

## Character Profile

- **ID**: `tech-architect`
- **Name**: Tech Architect
- **Role**: Senior Technical Architecture Consultant
- **Expertise**: Architecture design, technical evaluation, risk identification, cost assessment

## Activation

To use the Technical Architecture Consultant NPC, set the `VITE_NPC_PROFILE` environment variable:

```bash
VITE_NPC_PROFILE=tech-architect
```

Or at runtime in the browser console:

```javascript
window.__npc_id = 'tech-architect'
```

## Evaluation Structure

The consultant provides comprehensive technical evaluations following a structured 10-section format:

### 1. Tech Verdict (技术一句话结论)
One-sentence judgment on whether the technical solution is reasonable, feasible, and if refactoring is needed.

### 2. Technical Dimension Scoring (0-10 points)
Evaluates 8 technical dimensions:
- Architecture clarity (架构清晰度)
- Tech stack fit (技术栈匹配度)
- Complexity control (复杂度控制)
- Maintainability (可维护性)
- Scalability (扩展性)
- Performance & stability risks (性能与稳定性风险)
- Infrastructure maturity (基础设施成熟度)
- Long-term maintenance cost (长期维护成本)

### 3. Architecture Health (架构诊断)
Issues categorized as:
- 🟥 **Red**: Must fix immediately, cannot go live
- 🟨 **Yellow**: Viable to go live but needs close monitoring
- 🟩 **Green**: Advantages

### 4. Core Architecture Review (技术方案详细审查)
Detailed review covering:
- Module division rationality
- Tech stack appropriateness for Demo/MVP
- Critical engineering issues

### 5. 1-Day Actionable Technical Improvement List
Concrete, actionable improvements that can be completed in one day.

### 6. 1-Week Engineering Construction
Engineering improvements that require one week to implement.

### 7. Architecture Diagram (Text Version)
ASCII-art style architecture diagram showing system components and their relationships.

### 8. Minimum Viable Architecture (MLA) Recommendation
Simplified, lower-cost, more maintainable alternative architecture.

### 9. Long-term Maintenance Cost Assessment
Critical evaluation of:
- Manpower cost
- Technical debt growth rate
- Risk points

### 10. Final Recommendation
Go / Simplify / Refactor / Stop decision from a pure technical perspective.

## Usage Example

1. Start the application with the tech-architect profile:
   ```bash
   VITE_NPC_PROFILE=tech-architect pnpm dev
   ```

2. Describe your technical project in the chat interface

3. The consultant will provide a comprehensive structured evaluation following the 10-section format

## Character Statistics

- **Review Depth** (stress): Indicates how deep the analysis goes (0-100%)
- **Project Confidence** (trust): The consultant's confidence in the project's viability (0-100%)

These metrics adjust based on the conversation and provide feedback on the evaluation process.

## Localization

The consultant supports both English and Chinese:

- **English**: "Tech Architecture Consultant" / "Engineering Excellence Review"
- **Chinese**: "技术架构顾问" / "工程质量评估"

All evaluation content is generated in the selected language while maintaining the structured format.

## Implementation Details

The consultant is implemented with:
- Custom character profile in `src/config/characterProfile.ts`
- Specialized system prompt in `src/services/promptService.ts`
- Unified character model following the same schema as other NPCs
- Support for avatar generation and state management

## Notes

- This consultant focuses **purely on engineering**, not product operations or market concerns
- Evaluations are objective and based on established software engineering principles
- The structured output format is strictly maintained to ensure consistency and completeness
