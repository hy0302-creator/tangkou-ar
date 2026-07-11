/**
 * Admin App — main router.
 */
const App = {
  currentPage: 'dashboard',

  async init() {
    // Check if already logged in
    const token = API.getToken();
    if (token) {
      try {
        await API.verify();
        this.showApp();
        return;
      } catch (e) {
        API.clearToken();
      }
    }
    this.showLogin();
  },

  showLogin() {
    document.getElementById('page-login').classList.add('active');
    document.getElementById('page-app').classList.remove('active');
    LoginPage.init();
  },

  showApp() {
    document.getElementById('page-login').classList.remove('active');
    document.getElementById('page-app').classList.add('active');

    // Setup navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        this.navigate(page);
      });
    });

    // Change password
    document.getElementById('changePwdBtn').addEventListener('click', (e) => {
      e.preventDefault();
      Utils.openModal(`
        <h3>🔑 修改密码</h3>
        <div class="form-group">
          <label>旧密码</label>
          <input type="password" id="fOldPwd" placeholder="请输入旧密码">
        </div>
        <div class="form-group">
          <label>新密码</label>
          <input type="password" id="fNewPwd" placeholder="至少8个字符，建议包含字母和数字">
        </div>
        <div class="form-group">
          <label>确认新密码</label>
          <input type="password" id="fNewPwd2" placeholder="再次输入新密码">
        </div>
        <div class="form-actions">
          <button class="btn btn-outline" onclick="Utils.closeModal()">取消</button>
          <button class="btn btn-primary" id="btnSavePwd">保存</button>
        </div>
      `);

      document.getElementById('btnSavePwd').onclick = async () => {
        const oldPwd = document.getElementById('fOldPwd').value;
        const newPwd = document.getElementById('fNewPwd').value;
        const newPwd2 = document.getElementById('fNewPwd2').value;

        if (!oldPwd || !newPwd) {
          return Utils.showToast('请填写旧密码和新密码', 'error');
        }
        if (newPwd !== newPwd2) {
          return Utils.showToast('两次输入的新密码不一致', 'error');
        }
        if (newPwd.length < 8) {
          return Utils.showToast('新密码至少8个字符', 'error');
        }

        try {
          await API.changePassword(oldPwd, newPwd);
          Utils.showToast('✅ 密码修改成功！请重新登录');
          Utils.closeModal();
          setTimeout(() => {
            API.clearToken();
            location.reload();
          }, 1500);
        } catch (err) {
          Utils.showToast(err.message, 'error');
        }
      };
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      API.clearToken();
      location.reload();
    });

    // Load initial page
    this.navigate('dashboard');
  },

  navigate(page) {
    this.currentPage = page;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

    // Update panel
    document.querySelectorAll('.panel').forEach(el => el.classList.remove('active'));
    document.getElementById(`panel-${page}`)?.classList.add('active');

    // Load page content
    switch (page) {
      case 'dashboard': DashboardPage.load(); break;
      case 'contents': ContentsPage.load(); break;
      case 'categories': CategoriesPage.load(); break;
      case 'qrcodes': QRCodesPage.load(); break;
    }
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
