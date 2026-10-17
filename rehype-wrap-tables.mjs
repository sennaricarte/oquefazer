/**
 * Envolve cada <table> do Markdown em <div class="table-wrap">.
 * Permite rolagem horizontal no celular sem quebrar o layout da tabela.
 */
export default function rehypeWrapTables() {
	const wrap = (node) => {
		if (!node || !Array.isArray(node.children)) return;
		node.children = node.children.map((child) => {
			if (child.type === 'element' && child.tagName === 'table') {
				return {
					type: 'element',
					tagName: 'div',
					properties: { className: ['table-wrap'] },
					children: [child],
				};
			}
			wrap(child);
			return child;
		});
	};
	return (tree) => wrap(tree);
}
