sudo cp node-solarismon.service /etc/systemd/system
sudo systemctl daemon-reload
sudo systemctl enable node-solarismon
sudo systemctl start node-solarismon
sudo systemctl status node-solarismon

sudo cp openhab.service /etc/systemd/system
sudo systemctl daemon-reload
sudo systemctl enable openhab
sudo systemctl start openhab
sudo systemctl status openhab
