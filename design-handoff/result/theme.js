// 테마 세 가지 사이를 오간다. 앱에 넣을 때는 이 파일만 옮기면 된다.
// 상태는 <html data-theme> 하나뿐이고 색은 전부 design.css 3b 절이 정한다.
(function () {
  var KEY = 'skinmaker-theme';
  var THEMES = [
    { id: 'acid', name: '아씨드 콘크리트', dot: '#d9ff4f' },
    { id: 'solar', name: '솔라 사막', dot: '#0e9594' },
    { id: 'moss', name: '이끼와 유자', dot: '#a87d00' }
  ];

  function apply(id) {
    document.documentElement.setAttribute('data-theme', id);
    try { localStorage.setItem(KEY, id); } catch (e) {}
    document.querySelectorAll('[data-theme-btn]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-btn') === id));
    });
  }

  var saved = 'solar';
  try { saved = localStorage.getItem(KEY) || 'solar'; } catch (e) {}

  document.querySelectorAll('.themebar').forEach(function (bar) {
    if (bar.dataset.built) return;
    bar.dataset.built = '1';
    var lb = document.createElement('span');
    lb.className = 'lb';
    lb.textContent = '테마';
    bar.appendChild(lb);
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sm';
      b.setAttribute('data-theme-btn', t.id);
      var sw = document.createElement('span');
      sw.className = 'sw';
      sw.style.background = t.dot;
      b.appendChild(sw);
      b.appendChild(document.createTextNode(t.name));
      b.addEventListener('click', function () { apply(t.id); });
      bar.appendChild(b);
    });
  });

  apply(saved);
})();
