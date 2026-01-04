import { useState } from "react";
import { useModal, useAuth } from "../../contexts";
import { Tab, TabList } from "../ui";

export const AuthModal = () => {
  const { closeModal } = useModal();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      login(formData.email, formData.password);
    } else {
      register(formData.username, formData.email, formData.password);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box  p-0 overflow-hidden">
        {/* Custom Tabs - no background, sits directly on modal */}
        <div className=" pb-0">
          <TabList>
            <Tab active={isLogin} onClick={() => setIsLogin(true)} first>
              Login
            </Tab>
            <Tab active={!isLogin} onClick={() => setIsLogin(false)}>
              Register
            </Tab>
          </TabList>
        </div>

        {/* Form content with bg matching active tab */}
        <div className="bg-base-100 p-6">
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <fieldset className="fieldset mb-4">
                <legend className="fieldset-legend">Username</legend>
                <input
                  type="text"
                  name="username"
                  className="input input-bordered w-full bg-base-200"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={handleChange}
                  required={!isLogin}
                />
              </fieldset>
            )}

            <fieldset className="fieldset mb-4">
              <legend className="fieldset-legend">Email</legend>
              <input
                type="email"
                name="email"
                className="input input-bordered w-full bg-base-200"
                placeholder="Enter email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </fieldset>

            <fieldset className="fieldset mb-4">
              <legend className="fieldset-legend">Password</legend>
              <input
                type="password"
                name="password"
                className="input input-bordered w-full bg-base-200"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </fieldset>

            <div className="flex justify-center gap-4 mt-6">
              <button type="button" className="btn" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {isLogin ? "Login" : "Register"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={closeModal}>close</button>
      </form>
    </dialog>
  );
};
