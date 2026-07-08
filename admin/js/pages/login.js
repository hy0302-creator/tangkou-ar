/**
 * Login page logic.
 */
const LoginPage = {
  init() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value.trim();
      const errorEl = document.getElementById('loginError');

      if (!username || !password) {
        errorEl.textContent = '请输入用户名和密码';
        return;
      }

      errorEl.textContent = '';
      const btn = form.querySelector('button');
      btn.textContent = '登录中...';
      btn.disabled = true;

      try {
        const result = await API.login(username, password);
        API.setToken(result.token);
        App.showApp();
      } catch (err) {
        errorEl.textContent = err.message;
      } finally {
        btn.textContent = '登 录';
        btn.disabled = false;
      }
    });
  },
};
