// Auto-collapse ✅ branches in markmap render
// Injected into markmap HTML via --js flag

(function() {
  // Wait for markmap to render
  const observer = new MutationObserver(() => {
    const svg = document.querySelector('.markmap svg');
    if (!svg) return;

    // Find all ✅ nodes and collapse them
    const nodes = svg.querySelectorAll('g.markmap-node');
    nodes.forEach(node => {
      const text = node.textContent || '';
      // Collapse if branch shows ✅ (done/completed)
      // Don't collapse if it's a leaf (has no children)
      const circle = node.querySelector('circle.markmap-node-circle');
      const hasChildren = circle && circle.__data__?.payload?.fold !== undefined;
      
      if ((text.includes('✅') || text.includes('✅')) && hasChildren) {
        // Trigger collapse: click the circle
        const clickEvt = new MouseEvent('click', { bubbles: true });
        circle.dispatchEvent(clickEvt);
      }
    });

    observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
