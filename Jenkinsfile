pipeline {
    agent any
    stages {
        stage('Test') {
            steps {
				sh 'pwd'
				sh 'ls -ltr'
				sh 'chmod 777 runDocker'
				sh './runDocker.sh'
            }
        }
    }
}